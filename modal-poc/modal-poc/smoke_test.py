import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any

import httpx

SAMPLE_MESSAGE = (
    "A partner says their enterprise integration is blocked before tomorrow's launch "
    "because production API credentials are returning 401 errors."
)
REQUIRED_RESULT_FIELDS = ("category", "priority", "summary", "next_action")


def _headers() -> dict[str, str]:
    key = os.getenv("MODAL_PROXY_KEY")
    secret = os.getenv("MODAL_PROXY_SECRET")
    if key or secret:
        if not key or not secret:
            raise ValueError(
                "Set both MODAL_PROXY_KEY and MODAL_PROXY_SECRET, or set neither."
            )
        return {"Modal-Key": key, "Modal-Secret": secret}
    return {}


def _request(
    client: httpx.Client,
    method: str,
    url: str,
    **kwargs: Any,
) -> tuple[httpx.Response, float]:
    started = time.perf_counter()
    response = client.request(method, url, **kwargs)
    duration = time.perf_counter() - started
    return response, duration


def _json(response: httpx.Response, label: str) -> dict[str, Any]:
    try:
        payload = response.json()
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{label} returned invalid JSON") from exc
    if not isinstance(payload, dict):
        raise RuntimeError(f"{label} returned JSON that is not an object")
    return payload


def _require_ok(response: httpx.Response, label: str) -> None:
    if response.status_code < 200 or response.status_code >= 300:
        body = response.text[:1000]
        raise RuntimeError(
            f"{label} failed with HTTP {response.status_code}: {body}"
        )


def _validate_health(payload: dict[str, Any]) -> None:
    required = ("status", "runtime", "model", "worker_id")
    missing = [name for name in required if not payload.get(name)]
    if missing:
        raise RuntimeError(f"/health missing required values: {', '.join(missing)}")
    if payload["status"] != "ok":
        raise RuntimeError(f"/health status is not ok: {payload['status']!r}")


def _validate_analyze(payload: dict[str, Any]) -> None:
    result = payload.get("result")
    meta = payload.get("meta")
    if not isinstance(result, dict) or not isinstance(meta, dict):
        raise RuntimeError("/analyze must contain object fields result and meta")
    for field in REQUIRED_RESULT_FIELDS:
        if not isinstance(result.get(field), str):
            raise RuntimeError(f"/analyze result.{field} is missing or not a string")
    if meta.get("schema_valid") is not True:
        raise RuntimeError("/analyze meta.schema_valid is not true")
    for field in ("model", "runtime", "worker_id"):
        if not meta.get(field):
            raise RuntimeError(f"/analyze meta.{field} is missing")


def _print_run(
    label: str,
    url: str,
    response: httpx.Response,
    duration: float,
    payload: dict[str, Any],
) -> None:
    meta = payload.get("meta") if isinstance(payload.get("meta"), dict) else payload
    print(f"\n[{label}]")
    print(f"timestamp_utc : {datetime.now(timezone.utc).isoformat()}")
    print(f"endpoint      : {url}")
    print(f"http_status   : {response.status_code}")
    print(f"duration_ms   : {round(duration * 1000)}")
    print(f"worker_id     : {meta.get('worker_id')}")
    print(f"gpu           : {meta.get('gpu')}")
    print(f"runtime       : {meta.get('runtime')}")
    print(f"model         : {meta.get('model')}")
    if "schema_valid" in meta:
        print(f"schema_valid  : {meta.get('schema_valid')}")
        print(f"inference_ms  : {meta.get('inference_ms')}")
    if "ollama_version" in payload:
        print(f"ollama_version: {payload.get('ollama_version')}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run one controlled health + analyze cycle against the Pegas Modal PoC."
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("MODAL_POC_BASE_URL"),
        help="Deployed Modal base URL, or set MODAL_POC_BASE_URL.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=240.0,
        help="Per-request timeout in seconds (default: 240).",
    )
    args = parser.parse_args()

    if not args.base_url:
        print(
            "ERROR: provide --base-url or set MODAL_POC_BASE_URL.",
            file=sys.stderr,
        )
        return 2

    base_url = args.base_url.rstrip("/")
    try:
        headers = _headers()
        with httpx.Client(headers=headers, timeout=args.timeout) as client:
            health_url = f"{base_url}/health"
            health_response, health_duration = _request(client, "GET", health_url)
            _require_ok(health_response, "/health")
            health_payload = _json(health_response, "/health")
            _validate_health(health_payload)
            _print_run(
                "HEALTH", health_url, health_response, health_duration, health_payload
            )

            analyze_url = f"{base_url}/analyze"
            analyze_response, analyze_duration = _request(
                client,
                "POST",
                analyze_url,
                json={"message": SAMPLE_MESSAGE},
            )
            _require_ok(analyze_response, "/analyze")
            analyze_payload = _json(analyze_response, "/analyze")
            _validate_analyze(analyze_payload)
            _print_run(
                "ANALYZE",
                analyze_url,
                analyze_response,
                analyze_duration,
                analyze_payload,
            )

            print("\nresult:")
            print(json.dumps(analyze_payload["result"], indent=2, ensure_ascii=False))
            print("\nPASS: one smoke/lifecycle cycle completed successfully.")
            return 0
    except (httpx.HTTPError, RuntimeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
