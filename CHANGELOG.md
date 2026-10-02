# Changelog

All notable project milestones and decisions should be recorded here.

## 2026-10-01 — Bootstrap started

### Project setup
- Adopted project name: Pegas.
- Confirmed BOOTSTRAP mode.
- Confirmed roadmap: infrastructure -> smoke test -> frontend -> integration -> UX states -> benchmark -> deployment -> portfolio package.
- Confirmed that frontend implementation must not begin before successful infrastructure smoke test.

### RunPod infrastructure decisions
- Selected RunPod Pods rather than Serverless for MVP bootstrap.
- Selected Runpod PyTorch 2.8.0 as the base template after a suitable Ollama Pod template was not available in the shown Pod-template flow.
- Selected NVIDIA L4 24 GB as the current target GPU, subject to availability at actual deployment time.
- Observed GPU price during setup: approximately $0.49/hour.
- Decided not to create a paid Network Volume for the first smoke test.
- Plan for first smoke test: use the temporary container disk and accept that the environment may need to be recreated later.
- Pod deployment paused before any paid GPU session started.

### Evaluation preparation
- Designed a 25-message benchmark dataset.
- Defined ground-truth category and priority labels.
- Defined a labeling rubric for ambiguous cases.
- Froze the intended ground-truth contract: `id`, `message`, `expectedCategory`, `expectedPriority`.
- Defined benchmark metrics: category accuracy, priority accuracy, valid JSON rate, median latency, p95 latency.
- Defined manual error-analysis buckets.
- Defined the intended benchmark dashboard information hierarchy.

### Inference design preparation
- Defined the baseline triage system-prompt behavior.
- Defined the structured response fields and allowed category/priority values.
- Defined smoke-test success criteria.
- Defined the application error taxonomy: `MODEL_OFFLINE`, `MODEL_TIMEOUT`, `INVALID_MODEL_OUTPUT`, `INTERNAL_ERROR`.
- Kept model tag, quantization, endpoint/auth, timeout, and real latency unresolved until implementation evidence exists.

### Documentation preparation
- Created initial architecture context.
- Created README foundation.
- Created cost log template.
- Created architecture diagram specification.
- Created beginner guide outline.
- Created portfolio case outline.
- Created UI/UX specification covering main screen, benchmark screen, responsive behavior, validation, model status, and error states.
- Created implementation blueprint covering repository structure, file responsibilities, API/model boundaries, environment-variable policy, error mapping, benchmark architecture, and future coding sessions.

### Still pending
- Deploy RunPod Pod.
- Install/run Ollama.
- Pull Qwen3 4B.
- Verify model locally.
- Run first API smoke test.
- Record actual GPU/model endpoint details.


## 2026-10-01 — Stage 1-2 execution pack prepared

### Infrastructure execution preparation
- Prepared a paid-session runbook for RunPod -> Ollama -> qwen3:4b -> external HTTP smoke test.
- Added RunPod HTTP port 11434 and `OLLAMA_HOST=0.0.0.0` configuration requirements.
- Prepared exact Ollama install/start, model pull, local inference, external reachability, and structured-output checks.
- Prepared `SMOKE_TEST_REQUEST.json` and an evidence template.
- Refined Pegas inference baseline to `stream: false`, `think: false`, and `temperature: 0`.
- Documented that RunPod HTTP proxy exposure is public and that raw Ollama exposure is acceptable only for the short-lived smoke test. Final public endpoint authentication remains unresolved until after real infrastructure behavior is verified.
- Documented disposable-storage behavior for the first session and the need to save evidence outside the Pod before termination.

## 2026-10-01 — New-chat handoff package prepared

### Added
- Created `FULL_WORK_REPORT.md` with the complete factual handoff.
- Created standalone `INFERENCE_DESIGN_FOUNDATION.md`.
- Created standalone frozen `BENCHMARK_DATASET_V1.json` with 25 cases.
- Created standalone `BENCHMARK_LABELING_RUBRIC.md`.
- Created package-root `00_START_HERE_NEW_CHAT.md` with the exact continuation instructions.

### State
- No roadmap implementation stage was marked complete by this packaging work.
- Stage 1 remains PAUSED before paid RunPod deployment.
- Stage 2 remains NOT STARTED.
- Frontend implementation remains blocked until Stage 2 succeeds.


## 2026-10-02 - Frontend Base exception and project scaffold

### Process decision
- User explicitly approved preparing the frontend before the paid infrastructure smoke test.
- Previous Stage 3 gate was relaxed only for frontend preview work and optional Vercel preview deployment.
- Real model integration remains gated by Stage 2.

### Frontend implementation prepared
- Created a full Next.js + TypeScript + Tailwind project folder.
- Implemented `/` message-triage frontend.
- Implemented preset messages and empty-input validation.
- Implemented loading and clearly labeled local preview-result behavior.
- Implemented offline, timeout, invalid-output, and generic-error UI states.
- Implemented architecture explainer and responsive layout.
- Implemented `/benchmark` using the frozen 25-case dataset.
- Kept all benchmark metrics as `Not run` until real evaluation exists.
- Added benchmark search and category filtering.
- Added `.env.example`, Git ignore rules, Vercel deployment checklist, and frontend handoff.

### Verification limitation
- npm registry access is unavailable in the artifact-building environment.
- Dependencies were not installed here, so lint/build still require local verification.
- Stage 3 remains IN PROGRESS until local lint, build, and manual testing succeed.

## 2026-10-02 - Portfolio narrative and frontend redesign v2

### Product decision
- Reframed Pegas from a message-triage-first demo into a self-hosted/open-model portfolio proof.
- Message triage remains the demo workload but is no longer the primary project identity.
- Approved hierarchy: self-hosted AI proof -> reproducibility -> measured evidence -> triage workload.
- Added precise trust-boundary wording: inference is not delegated to a hosted LLM API, while Vercel and RunPod still provide infrastructure.

### Frontend redesign
- Reworked `/` around the self-hosted proof story.
- Added proof strip for model / cloud compute / hosted LLM API.
- Replaced generic loading emphasis with a visual inference-path state.
- Added `This inference` metadata panel for model, compute, runtime, latency, schema validity, and inference-provider proof.
- Reframed architecture card around `Where does your prompt go?`.
- Added four-step `What just happened` explanation.
- Added `/build` route with a six-step reproduction path.
- Reframed `/benchmark` as `Measured, not cherry-picked` and added a prominent future failure-analysis section.
- Removed public developer-state preview controls from the redesigned UI.

### Stage 1-2 proof redesign
- Added `SHOWCASE_PROOF_RUN.md`.
- Updated Stage 1-2 completion requirements to include a human-readable screenshot/GIF in addition to raw API evidence.
- Expanded the evidence template with model/GPU/runtime/latency/schema/trust-boundary proof fields.

### Documentation redesign
- Added `PRODUCT_POSITIONING.md`.
- Rewrote UI/UX, architecture diagram, beginner guide, portfolio case, README, implementation blueprint, inference foundation, context, and handoff files around the approved project goal.
- Frozen benchmark dataset and labeling rubric were intentionally retained unchanged.

### Verification state
- Real RunPod/Ollama/Qwen inference is still not executed.
- Benchmark scores still do not exist.
- Redesigned frontend source still requires local npm install/lint/build and manual visual verification before Stage 3 can be marked complete.
### Authority files synchronized
- Revised technical specification to `open_llm_cloud_tz_v2.docx`.
- Revised architect prompt to `PEGAS_ARCHITECT_PROMPT_v3.md`.
- Added accurate trust-boundary language: no hosted LLM API inference, while Vercel/RunPod remain infrastructure providers.
- Added mandatory Showcase Proof Run after the technical smoke test.
- Added frontend-preview exception while keeping real model integration gated by Stage 2.
- Updated spec mockups so illustrative/pending values are visibly labeled and are not presented as real benchmark or GPU evidence.

