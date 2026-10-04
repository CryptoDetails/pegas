# Pegas Modal GPU Lifecycle PoC

This directory is an isolated backend proof-of-concept. It does **not** modify the live Pegas frontend, Vercel deployment, existing `/api/analyze`, benchmark, proof UX, Build Guide, or blog.

## A. What this PoC proves

The test is intentionally narrow: one stable Modal HTTPS endpoint should be able to wake an L4-backed container from scale-to-zero, start our own Ollama automatically, use the baked `qwen3:4b` model, return structured JSON, scale down again, and later recover through the **same public URL** without manual infrastructure recovery.

The public service is a Modal Web Function using FastAPI via `@modal.asgi_app()`. Ollama listens only on `127.0.0.1:11434` inside the worker. The endpoint requires Modal proxy authentication.

Model persistence choice: this PoC **bakes Ollama and `qwen3:4b` into the Modal Image at build time**. The model is pulled once while the image is built and stored under `/opt/ollama/models`, so a new worker after scale-to-zero does not depend on a user opening a terminal or pulling the model again. No Modal Volume is needed for this baseline.

## B. Prerequisites

- Modal account
- Python 3.10+ available locally
- VS Code terminal / PowerShell

## C. Local setup

Open PowerShell in the `modal-poc` directory.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Authenticate the Modal CLI using the current supported browser flow:

```powershell
modal token new
```

If Modal already has an active authenticated profile on this machine, you can verify it with:

```powershell
modal token info
```

## D. Deploy

From the `modal-poc` directory:

```powershell
modal deploy app.py
```

The first deploy builds the image, installs Ollama, and pulls `qwen3:4b`; this is expected to take longer than a normal code-only deploy.

At the end of deployment, Modal prints the Web Function HTTPS URL. Copy that URL exactly and keep it unchanged for all lifecycle test cycles. It should be the base URL for the FastAPI app, with `/health` and `/analyze` appended by the smoke test.

## E. Proxy auth

The endpoint uses Modal's supported proxy authentication (`requires_proxy_auth=True`), not a custom application secret.

Create a proxy token:

```powershell
modal workspace proxy-tokens create --name pegas-modal-poc
```

The command prints a key with a `wk-` prefix and a secret with a `ws-` prefix. The secret is only shown at creation time. Do not commit either value.

Set them only in the current PowerShell session:

```powershell
$env:MODAL_PROXY_KEY="wk-REPLACE_ME"
$env:MODAL_PROXY_SECRET="ws-REPLACE_ME"
```

`smoke_test.py` sends these as the supported `Modal-Key` and `Modal-Secret` request headers.

If your Modal workspace uses environments/RBAC and the proxy token is not automatically allowed for the deployment environment, use Modal's proxy-token `allow` command for that environment before testing.

## F. First smoke test

Set the deployed base URL and run one controlled cycle:

```powershell
$env:MODAL_POC_BASE_URL="https://YOUR-DEPLOYED-MODAL-URL"; python .\smoke_test.py
```

You can also pass the URL directly:

```powershell
python .\smoke_test.py --base-url "https://YOUR-DEPLOYED-MODAL-URL"
```

The script performs exactly one `/health` request and one `/analyze` request. It never loops automatically.

## G. Lifecycle test protocol

Use this sequence manually. The app is configured with `min_containers=0`, `max_containers=1`, and `scaledown_window=60` seconds.

```text
Cycle 1:
1. run smoke_test.py after deploy
2. record endpoint + worker_id + cold/warm latency
3. run it again immediately for warm latency
4. stop sending requests

Cycle 2:
5. wait longer than the configured scaledown_window
6. run smoke_test.py again WITHOUT redeploying
7. verify the endpoint URL is identical
8. verify inference succeeds without manual Modal actions
9. record worker_id and latency
10. run again immediately for warm latency

Cycle 3:
11. wait for scale-to-zero again
12. repeat through the SAME URL

Pass condition:
- same public URL in every cycle;
- no code redeploy between cycles;
- no manual container/GPU start;
- no Web Terminal;
- no Ollama reinstall;
- no model pull initiated by the user;
- inference succeeds after scale-to-zero;
- structured output remains valid.
```

A different `worker_id` after a cold cycle is acceptable and useful evidence. The PoC uses the container hostname as `worker_id`; it identifies the running worker for that container lifetime, but it is not claimed to be a permanent Modal infrastructure ID.

## H. Evidence to save

Preserve:

- deployed URL, but never auth secrets;
- screenshots of Modal logs/containers showing cold starts where useful;
- smoke-test output for each cold/warm run;
- actual GPU label returned by `nvidia-smi`;
- actual Ollama version returned by the running worker;
- worker IDs;
- cold and warm request latency;
- `inference_ms` from `/analyze`;
- any startup errors.

`/health` returns the model, Ollama version, GPU label, and worker ID. `/analyze` returns the structured result plus runtime metadata and `schema_valid: true`.

## I. Known scope limit

- This PoC does not modify Vercel or the existing Pegas repository.
- It does not prove exact production `/api/analyze` category/priority enum compatibility; this PoC intentionally validates only the four required string fields.
- It does not use vLLM.
- It does not use Modal GPU memory snapshots.
- It does not use a permanently warm GPU.
- It is a lifecycle baseline only, not a production migration.
- A successful local/static verification does **not** prove Modal scale-to-zero recovery. That must be demonstrated with the manual multi-cycle protocol above against a real deployed Modal app.

## API shape

### `GET /health`

Returns JSON similar to:

```json
{
  "status": "ok",
  "runtime": "ollama",
  "model": "qwen3:4b",
  "ollama_version": "...",
  "gpu": "NVIDIA L4",
  "worker_id": "..."
}
```

If a runtime detail cannot be detected reliably, the service returns `null` rather than inventing a value.

### `POST /analyze`

Request:

```json
{
  "message": "..."
}
```

Response:

```json
{
  "result": {
    "category": "...",
    "priority": "...",
    "summary": "...",
    "next_action": "..."
  },
  "meta": {
    "model": "qwen3:4b",
    "runtime": "ollama",
    "gpu": "NVIDIA L4",
    "worker_id": "...",
    "schema_valid": true,
    "inference_ms": 1234
  }
}
```

This is deliberately **not** claimed to be the production Pegas `/api/analyze` contract.
