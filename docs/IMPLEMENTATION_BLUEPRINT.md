# PEGAS IMPLEMENTATION BLUEPRINT v2

Status: REDESIGNED PREPARATION BASELINE
Date: 2026-10-02

## 1. Product hierarchy

Implementation must serve this order:

1. self-hosted AI proof;
2. reproducibility / guide;
3. measured evidence;
4. message-triage demo workload.

## 2. Runtime architecture

```text
Browser
  -> Next.js UI
  -> POST /api/analyze
  -> Next.js Route Handler
  -> server-side model adapter
  -> RunPod endpoint
  -> Ollama
  -> Qwen3 4B
  -> structured model output
  -> schema validation + metadata
  -> browser result
```

## 3. Public routes

### `/` — Live Proof

Responsibilities:

- explain self-hosted/open-model premise immediately;
- show proof strip: model / compute / hosted LLM API;
- accept demo input;
- visualize request path during loading;
- show structured result;
- show proof metadata for the inference;
- link to build guide.

### `/benchmark` — Measured Evidence

Responsibilities:

- show real metrics only;
- keep failed cases visible;
- show 3-5 real error-analysis examples;
- never fabricate timestamps or scores.

### `/build` — Reproduce the Experiment

Responsibilities:

- give the six-step build path;
- explain why each layer exists;
- tell the viewer what fact to record;
- link to long-form guide/repo when those URLs exist.

## 4. Planned repository structure

```text
pegas/
├── app/
│   ├── page.tsx
│   ├── benchmark/page.tsx
│   ├── build/page.tsx
│   └── api/analyze/route.ts
├── components/
│   ├── AppHeader.tsx
│   ├── ArchitectureCard.tsx
│   ├── ProofStrip.tsx
│   ├── InferencePath.tsx
│   ├── MessageInput.tsx
│   ├── ResultCard.tsx
│   ├── BenchmarkTable.tsx
│   └── BuildGuideTeaser.tsx
├── lib/
│   ├── prompt.ts
│   ├── schema.ts
│   ├── ollama.ts
│   └── types.ts
├── data/benchmark.json
├── docs/
├── README.md
├── PEGAS_ARCHITECT_CONTEXT.md
└── .env.example
```

## 5. Model/application contract

Request:

```json
{ "message": "..." }
```

Model-generated fields:

```json
{
  "category": "integration",
  "priority": "medium",
  "summary": "...",
  "nextAction": "..."
}
```

Server-added proof metadata:

```json
{
  "model": "qwen3:4b",
  "compute": "<actual GPU label>",
  "runtime": "Ollama",
  "latencyMs": 1234,
  "schemaValid": true
}
```

The exact GPU label must come from verified infrastructure configuration, not model output.

## 6. Trust-boundary rules

- Browser never calls RunPod/Ollama directly in the final app.
- Model endpoint and auth stay server-side.
- No secret uses `NEXT_PUBLIC_*`.
- UI may state "Hosted LLM API: none" only in the narrow inference-provider sense.
- UI must clarify that Vercel and RunPod still provide infrastructure.

## 7. Frontend preview rule

Before Stage 2:

- preview may visualize the request path;
- preview output must be labeled as local UI data;
- GPU, latency, schema-valid status, benchmark scores, and live-model status must not be fabricated.

After Stage 2 + Stage 4:

- replace local preview behavior with `/api/analyze`;
- remove or hide preview-only labels;
- populate proof metadata from factual configuration/results.

## 8. Inference baseline

- `stream: false`
- `think: false`
- JSON Schema structured output
- `temperature: 0`

Verify against the actual installed Ollama version during Stage 2.

## 9. Error mapping

Application error classes:

- `MODEL_OFFLINE`
- `MODEL_TIMEOUT`
- `INVALID_MODEL_OUTPUT`
- `INTERNAL_ERROR`

Raw RunPod/Ollama errors, URLs, tokens, stack traces, and CUDA messages never render in the browser.

## 10. Benchmark architecture

Ground truth remains frozen in `data/benchmark.json`.

Per-run measurements:

- actualCategory;
- actualPriority;
- categoryCorrect;
- priorityCorrect;
- jsonValid;
- latencyMs.

Aggregate metrics:

- category accuracy;
- priority accuracy;
- valid output rate;
- median latency;
- p95 latency.

## 11. Coding sessions

### Session A — Portfolio Frontend Base

Current status: prepared, local build verification still required.

Scope:

- `/`, `/benchmark`, `/build`;
- self-hosted-first narrative;
- request-path loading visualization;
- result proof panel;
- benchmark evidence framing;
- reproducibility guide route.

### Session B — Real Model Integration

Gate: Stage 2 successful.

Scope:

- `lib/prompt.ts`;
- `lib/schema.ts`;
- `lib/ollama.ts`;
- `app/api/analyze/route.ts`;
- proof metadata;
- main-page live inference.

### Session C — Reliability / UX States

Scope:

- online/offline status;
- timeout;
- invalid output;
- generic error;
- final loading behavior.

### Session D — Benchmark Results

Scope:

- real 25-case run;
- metrics;
- saved result artifact;
- 3-5 error-analysis examples;
- benchmark UI population.

### Session E — Portfolio Publication

Scope:

- GitHub/Vercel;
- screenshots/GIF;
- README factual update;
- cost data;
- beginner guide;
- final case study.

## 12. Definition of a strong final demo

A new viewer should understand in under 10 seconds:

- what model is running;
- where it is running;
- where the prompt goes;
- that no hosted LLM API performs inference;
- how fast the request was;
- whether the output was valid;
- how the model performed on the benchmark;
- where to learn how to reproduce it.
