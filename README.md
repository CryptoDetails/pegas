# Pegas

## Self-host an open LLM in the cloud

**From rented GPU to a measurable web app, without relying on a hosted LLM API for inference.**

Pegas is a portfolio project that documents the full path from cloud GPU to open model, inference server, web interface, benchmark, cost, and beginner-friendly guide.

The message-triage workflow is only the demo workload. The real subject is the infrastructure and the proof around it.

## What Pegas proves

- An open model can run on a rented GPU instance you deploy.
- The browser can use that model without receiving the private model endpoint or credentials.
- Prompts do not need to be delegated to a hosted third-party LLM API.
- The setup can be measured with real latency, structured-output checks, benchmark accuracy, failures, and cost.
- The whole process can be documented well enough for another person to reproduce it.

## Important trust-boundary clarification

Pegas does **not** claim that data "goes nowhere".

Vercel and RunPod still provide infrastructure. The narrower, verifiable claim is:

> Your prompt is not sent to a third-party hosted LLM API. Inference runs on the cloud GPU instance deployed for Pegas.

## Demo experience

The public app is designed around three routes:

- `/` — **Live Proof**: send one message, watch the inference path, see the structured result and proof metadata.
- `/benchmark` — **Measured Evidence**: fixed dataset, accuracy, latency, and real failures.
- `/build` — **Build Guide**: compact reproduction path from GPU rental to deployed web app.

## Target request path

```text
Browser
  -> Next.js frontend
  -> POST /api/analyze
  -> Next.js server-side route
  -> RunPod GPU
  -> Ollama
  -> Qwen3 4B
  -> validated structured JSON
  -> result in UI
```

The browser never calls RunPod/Ollama directly in the final architecture.

## Live-proof result

The final demo should show both the model decision and the evidence behind it:

```text
Category
Priority
Summary
Recommended next action

Model
GPU
Runtime
Latency
Structured output: valid
Hosted LLM API: none in inference path
```

## Evaluation

Pegas uses a frozen 25-case benchmark.

Metrics:

- Category accuracy
- Priority accuracy
- Valid structured-output rate
- Median latency
- P95 latency
- Manual error analysis

The case deliberately keeps failed examples visible.

## Current factual state

### Infrastructure

- RunPod Pods selected.
- PyTorch template selected during bootstrap.
- L4 24 GB was the preferred GPU candidate during the initial setup, but availability and price must be re-checked before payment.
- No paid Pod has been deployed yet.
- Ollama is not installed yet.
- Qwen3 4B is not running yet.
- No real model latency or benchmark score exists yet.

### Frontend

A redesigned frontend preview exists and is intentionally honest about the missing live GPU connection.

Implemented preview routes:

- `/`
- `/benchmark`
- `/build`

The preview visualizes the intended request path but does not claim that a live model request occurred.

## Planned stack

| Layer | Technology |
|---|---|
| Development | VS Code on Windows |
| GPU hosting | RunPod Pods |
| Inference runtime | Ollama |
| Model | Qwen3 4B |
| Frontend/API | Next.js + TypeScript |
| Styling | Tailwind CSS |
| Frontend hosting | Vercel |
| Version control | GitHub |
| Evaluation | 25 labeled messages |

## Reproducibility evidence to record from the real build

- actual GPU SKU and hourly price;
- region;
- template;
- Ollama version;
- exact model tag / quantization;
- endpoint/auth method;
- first successful structured API request;
- proof-run latency;
- benchmark results;
- real failures;
- total GPU runtime and spend;
- final public URL and repository commit.

## Run the frontend preview locally

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Then open:

```text
http://localhost:3000
http://localhost:3000/benchmark
http://localhost:3000/build
```

## Server-side variables reserved for live integration

```text
MODEL_BASE_URL=
MODEL_AUTH_TOKEN=
OLLAMA_MODEL=
GPU_LABEL=
```

Real secrets must never use `NEXT_PUBLIC_*` and must never be committed.

## Project principle

A successful demo is not enough.

Pegas should show:

**what ran, where it ran, how the request moved, what it cost, how well it worked, where it failed, and how another person can repeat it.**
