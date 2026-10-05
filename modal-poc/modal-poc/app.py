import json
import os
import socket
import subprocess
import time
from typing import Any

import modal

APP_NAME = "pegas-modal-lifecycle-poc"
MODEL = "qwen3:4b"
OLLAMA_BASE_URL = "http://127.0.0.1:11434"
OLLAMA_MODELS = "/opt/ollama/models"

app = modal.App(APP_NAME)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ca-certificates", "curl", "pciutils", "zstd")
    .run_commands(
        "curl -fsSL https://ollama.com/install.sh | sh",
        "mkdir -p /opt/ollama/models",
        (
            "OLLAMA_HOST=127.0.0.1:11434 OLLAMA_MODELS=/opt/ollama/models "
            "sh -c 'ollama serve >/tmp/ollama-build.log 2>&1 & pid=$!; "
            "for i in $(seq 1 60); do curl -fsS http://127.0.0.1:11434/api/version >/dev/null 2>&1 && break; sleep 1; done; "
            "curl -fsS http://127.0.0.1:11434/api/version >/dev/null; "
            "ollama pull qwen3:4b; kill $pid; wait $pid || true'"
        ),
    )
    .env(
        {
            "OLLAMA_HOST": "127.0.0.1:11434",
            "OLLAMA_MODELS": OLLAMA_MODELS,
        }
    )
    .uv_pip_install("fastapi>=0.116,<1", "httpx>=0.27,<1")
)


def _run_text(command: list[str]) -> str | None:
    try:
        completed = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None
    value = completed.stdout.strip() or completed.stderr.strip()
    return value or None


def _gpu_name() -> str | None:
    return _run_text(
        ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"]
    )


def _ollama_version_cli() -> str | None:
    value = _run_text(["ollama", "--version"])
    if not value:
        return None
    # Typical output is "ollama version is X.Y.Z". Keep the actual CLI output if it changes.
    return value


def _worker_id() -> str:
    # Modal does not promise a public immutable worker UUID to application code.
    # The container hostname is stable for the life of one worker and is useful
    # as lifecycle evidence across scale-to-zero cycles.
    return socket.gethostname()


def _wait_for_ollama(timeout_seconds: int = 120) -> None:
    import httpx

    deadline = time.monotonic() + timeout_seconds
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            response = httpx.get(f"{OLLAMA_BASE_URL}/api/version", timeout=2.0)
            if response.status_code == 200:
                return
        except Exception as exc:  # startup loop; final error is raised below
            last_error = exc
        time.sleep(1)
    raise RuntimeError(f"Ollama did not become ready: {last_error}")


def _start_ollama() -> subprocess.Popen[Any]:
    process = subprocess.Popen(
        ["ollama", "serve"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
        env={
            **os.environ,
            "OLLAMA_HOST": "127.0.0.1:11434",
            "OLLAMA_MODELS": OLLAMA_MODELS,
        },
    )
    try:
        _wait_for_ollama()
    except Exception:
        process.terminate()
        raise
    return process


def _model_is_available() -> bool:
    import httpx

    response = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10.0)
    response.raise_for_status()
    payload = response.json()
    names = {item.get("name") for item in payload.get("models", [])}
    return MODEL in names or any(
        isinstance(name, str) and name.startswith(f"{MODEL}:") for name in names
    )


RESULT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "category": {"type": "string"},
        "priority": {"type": "string"},
        "summary": {"type": "string"},
        "next_action": {"type": "string"},
    },
    "required": ["category", "priority", "summary", "next_action"],
    "additionalProperties": False,
}


def _validate_result(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        raise ValueError("model output is not a JSON object")
    required = ("category", "priority", "summary", "next_action")
    for key in required:
        if not isinstance(value.get(key), str):
            raise ValueError(f"field {key!r} is missing or not a string")
    return {key: value[key] for key in required}


def _infer(message: str) -> tuple[dict[str, str], int]:
    import httpx

    system = (
        "Classify the business message and return only the requested structured JSON. "
        "Use concise plain strings. category and priority are free-form labels for this PoC; "
        "do not assume production enums."
    )
    request_body = {
        "model": MODEL,
        "stream": False,
        "think": False,
        "format": RESULT_SCHEMA,
        "options": {"temperature": 0},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": message},
        ],
    }

    last_error: Exception | None = None
    for attempt in range(2):
        started = time.perf_counter()
        try:
            response = httpx.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=request_body,
                timeout=180.0,
            )
            response.raise_for_status()
            payload = response.json()
            content = payload["message"]["content"]
            parsed = json.loads(content)
            result = _validate_result(parsed)
            inference_ms = round((time.perf_counter() - started) * 1000)
            return result, inference_ms
        except (httpx.HTTPError, KeyError, TypeError, json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            if attempt == 0:
                # One intentionally limited retry with the same deterministic schema request.
                continue

    raise RuntimeError(f"Ollama returned invalid structured output: {last_error}")


@app.function(
    image=image,
    gpu="L4",
    min_containers=0,
    max_containers=1,
    scaledown_window=150,
    timeout=300,
    startup_timeout=180,
    enable_memory_snapshot=False,
)
@modal.asgi_app(requires_proxy_auth=True)
def web():
    from fastapi import FastAPI, HTTPException, Request, Response
    from pydantic import BaseModel, field_validator

    api = FastAPI(title="Pegas Modal Lifecycle PoC", docs_url=None, redoc_url=None)
    ollama_process = _start_ollama()

    if not _model_is_available():
        ollama_process.terminate()
        raise RuntimeError(
            f"Required model {MODEL!r} is not present in the baked image at {OLLAMA_MODELS}."
        )

    class AnalyzeRequest(BaseModel):
        message: str

        @field_validator("message")
        @classmethod
        def message_must_be_non_empty(cls, value: str) -> str:
            if not value.strip():
                raise ValueError("message must not be empty")
            return value

    @api.get("/health")
    def health():
        import httpx

        try:
            version_response = httpx.get(
                f"{OLLAMA_BASE_URL}/api/version", timeout=5.0
            )
            version_response.raise_for_status()
            api_version = version_response.json().get("version")
        except Exception:
            api_version = None

        return {
            "status": "ok",
            "runtime": "ollama",
            "model": MODEL,
            "ollama_version": api_version or _ollama_version_cli(),
            "gpu": _gpu_name(),
            "worker_id": _worker_id(),
        }

    @api.post("/analyze")
    def analyze(request: AnalyzeRequest):
        try:
            result, inference_ms = _infer(request.message.strip())
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        return {
            "result": result,
            "meta": {
                "model": MODEL,
                "runtime": "ollama",
                "gpu": _gpu_name(),
                "worker_id": _worker_id(),
                "schema_valid": True,
                "inference_ms": inference_ms,
            },
        }

    @api.post("/api/generate")
    async def generate(request: Request):
        import httpx

        try:
            request_body = await request.json()
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid JSON request body") from exc

        try:
            async with httpx.AsyncClient() as client:
                upstream = await client.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json=request_body,
                    timeout=180.0,
                )
        except httpx.TimeoutException as exc:
            raise HTTPException(status_code=504, detail="Ollama request timed out") from exc
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="Ollama request failed") from exc

        return Response(
            content=upstream.content,
            status_code=upstream.status_code,
            media_type=upstream.headers.get("content-type", "application/json"),
        )

    return api
