# PEGAS_ARCHITECT_CONTEXT

## 0. Authority files

Current project authority after the 2026-10-02 redesign:
- `open_llm_cloud_tz_v2.docx` — product scope, portfolio goal, trust boundary, frontend proof surfaces, evaluation and Definition of Done.
- `PEGAS_ARCHITECT_PROMPT_v3.md` — architect process, roadmap, preview exception, Showcase Proof requirements and project invariants.

Older TЗ/prompt versions are historical only and must not override these files.


Last updated: 2026-10-02
Project: Pegas
Mode: BOOTSTRAP with frontend-preview exception

## 1. Core project goal

Pegas is a portfolio proof of a simple, reproducible self-hosted/open-model workflow.

The primary question is:

> Can one person without an ML-engineering background deploy an open LLM on rented cloud GPU infrastructure, use it from a web app without delegating inference to a hosted LLM API, measure the result, and explain the process well enough for another person to reproduce it?

Message triage is the demonstration workload, not the main product story.

Product hierarchy:

1. Self-hosted AI proof
2. Reproducibility / guide
3. Measured evidence
4. Message-triage demo workload

## 2. Trust-boundary rule

Allowed claim:

> Your prompt is not sent to a third-party hosted LLM API. Inference runs on the cloud GPU instance you deploy and control.

Required clarification:

> Vercel and RunPod still provide infrastructure. The difference is that model inference is not delegated to a hosted LLM provider.

Never claim that data "goes nowhere" or never leaves the user's device.

## 3. Current roadmap state

### Stage 1 — GPU / Model Infrastructure
Status: PAUSED

Prepared decisions:
- Provider: RunPod Pods.
- Base template used in planning: Runpod PyTorch 2.8.0 or current equivalent.
- Preferred bootstrap GPU candidate: NVIDIA L4 24 GB, subject to current availability/price.
- Observed historical price: approximately $0.49/hour; must be re-checked before payment.
- First smoke-test storage strategy: disposable container storage; no paid Network Volume.
- Target runtime: Ollama.
- Target model: Qwen3 4B.

Not done:
- no Pod deployed;
- no GPU time intentionally consumed for the real experiment;
- Ollama not installed;
- Qwen3 not pulled;
- no live model endpoint exists.

### Stage 2 — Infrastructure Smoke Test
Status: NOT STARTED
Preparation: READY v2

Required outputs:

1. Technical smoke-test evidence.
2. Showcase Proof Run suitable for README / portfolio / guide.

Completion evidence:
- actual GPU and hourly price recorded;
- Ollama running;
- exact model tag recorded;
- local model inference succeeds;
- external HTTP API succeeds;
- structured output is schema-valid;
- latency measured;
- screenshot/GIF captures the visible inference path and real proof metadata;
- evidence saved outside the disposable Pod.

Prepared artifacts:
- `STAGE_1_2_EXECUTION_PACK.md`
- `SMOKE_TEST_REQUEST.json`
- `SMOKE_TEST_EVIDENCE_TEMPLATE.md`
- `SHOWCASE_PROOF_RUN.md`

### Stage 3 — Frontend Base
Status: IN PROGRESS

User-approved exception:
- frontend may be prepared and optionally deployed as a clearly labeled preview before Stage 2;
- real model integration remains blocked until Stage 2 succeeds.

Frontend v2 prepared:
- `/` Live Proof Demo;
- `/benchmark` Measured Evidence;
- `/build` Reproduce the Experiment;
- self-hosted-first hero and proof strip;
- request-path loading visualization;
- result proof panel;
- trust-boundary explanation;
- benchmark framing around measured evidence and failures;
- compact reproduction guide.

Still required before Stage 3 COMPLETE:
- `npm install`;
- `npm run lint`;
- `npm run build`;
- manual desktop/mobile verification;
- optional Vercel preview deployment.

### Stage 4 — Model Integration
Status: NOT STARTED
Preparation: READY

Planned files:
- `lib/prompt.ts`
- `lib/schema.ts`
- `lib/ollama.ts`
- `app/api/analyze/route.ts`

Planned success payload includes model decision plus server-added proof metadata:
- model;
- compute/GPU label;
- runtime;
- latency;
- schema-valid flag.

### Stage 5 — UX / Reliability States
Status: NOT STARTED
Preparation: READY

Required states:
- ready;
- request path / loading;
- success;
- validation;
- model offline;
- timeout;
- invalid structured output;
- generic internal error.

### Stage 6 — Benchmark / Evaluation
Status: NOT STARTED
Preparation: READY

Frozen dataset:
- 25 cases;
- expected category and priority;
- labels must not be changed after seeing model output simply to improve scores.

Metrics:
- Category accuracy
- Priority accuracy
- Valid structured-output rate
- Median latency
- P95 latency

Portfolio requirement:
- show 3-5 real failed cases and analyze likely cause.

### Stage 7 — Deployment
Status: NOT STARTED
Preparation: PARTIAL

Targets:
- GitHub public repository;
- Vercel frontend/server route;
- server-side secrets only;
- no raw private model endpoint or token in client bundle.

### Stage 8 — Portfolio / Publication
Status: NOT STARTED
Preparation: REDESIGNED FOUNDATION READY

Required outputs:
- live demo;
- GitHub;
- architecture + trust-boundary diagrams;
- Showcase Proof Run screenshot/GIF;
- benchmark results;
- real failures;
- cost breakdown;
- beginner guide;
- portfolio case;
- blog/article material.

## 4. Public demo information architecture

### `/` — Live Proof

Viewer should understand within seconds:
- open model;
- cloud GPU;
- hosted LLM API not in inference path;
- visible request path;
- structured result;
- model/GPU/runtime/latency/schema proof;
- link to reproduce the build.

### `/benchmark` — Measured Evidence

Story:
- measured, not cherry-picked;
- fixed dataset;
- real metrics;
- real misses remain visible.

### `/build` — Reproduce the Experiment

Six-step path:
1. Rent GPU
2. Run Ollama
3. Pull open model
4. Prove API
5. Connect Next.js server-side
6. Benchmark / cost / deploy

## 5. Target runtime architecture

```text
Browser
  -> Next.js UI
  -> POST /api/analyze
  -> Next.js server-side Route Handler
  -> RunPod
  -> Ollama
  -> Qwen3 4B
  -> structured output
  -> validation + proof metadata
  -> UI
```

## 6. Security invariants

- Browser never calls RunPod/Ollama directly in the final application.
- Model endpoint credentials stay server-side.
- Secrets never use `NEXT_PUBLIC_*`.
- No real confidential business messages in public examples or benchmark.
- Raw infrastructure errors never render in the browser.
- v1 still has no auth, database, RAG, agents, vector DB, queues, Kubernetes, or fine-tuning.

## 7. Inference baseline

Prepared baseline:
- `stream: false`;
- `think: false`;
- `temperature: 0`;
- JSON Schema structured output.

Verify all runtime details against the real installed Ollama version.

## 8. Current frontend preview truthfulness rule

Until live integration exists:
- UI preview output is labeled as preview;
- GPU is marked not connected/pending;
- latency is not measured;
- schema-valid status is not claimed;
- benchmark scores stay `Not run`;
- no public copy may imply that the model already ran.

## 9. Exact next project actions

If continuing frontend now:
1. Run local install/lint/build.
2. Review `/`, `/benchmark`, `/build` visually.
3. Fix only frontend issues found by verification.
4. Deploy preview to Vercel if desired.

When ready for paid model work:
1. Resume Stage 1 in RunPod.
2. Re-check GPU availability and price.
3. Execute `STAGE_1_2_EXECUTION_PACK.md`.
4. Complete `SMOKE_TEST_EVIDENCE_TEMPLATE.md`.
5. Capture Showcase Proof Run.
6. Stop paid compute and record real cost.
7. Open Stage 4 real model integration.
