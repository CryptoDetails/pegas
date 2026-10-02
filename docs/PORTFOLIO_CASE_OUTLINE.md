# PEGAS PORTFOLIO CASE — OUTLINE v2

Working title:

**Self-Hosting an Open LLM in the Cloud**

Subtitle:

**From rented GPU to a measurable web app, without relying on a hosted LLM API for inference.**

## 1. The question

> Can one person without an ML-engineering background deploy and use an open LLM in the cloud, understand exactly where the prompt goes, turn it into a useful web experience, and measure whether it actually works?

## 2. Why this matters

Most demos begin with a hosted model API.

Pegas begins one layer earlier: compute, model runtime, model endpoint, trust boundary, evaluation, and cost.

## 3. The experiment

The full chain:

`RunPod GPU -> Ollama -> Qwen3 4B -> API -> Next.js -> Vercel -> benchmark`

The narrow workload is business-message triage because it produces fast, understandable, measurable structured output.

## 4. Trust boundary

State the claim precisely:

- prompts are not sent to a hosted third-party LLM API;
- Vercel and RunPod still host infrastructure;
- browser never receives model credentials;
- the model runs on the GPU instance deployed for Pegas.

## 5. Infrastructure proof

Show:

- actual RunPod configuration;
- actual GPU;
- actual model tag;
- Ollama;
- successful API call;
- first measured latency;
- Showcase Proof Run.

## 6. Product experience

Show screenshots/GIF of:

- hero + proof strip;
- request-path loading animation;
- live structured result;
- This inference metadata;
- model offline state;
- benchmark;
- build guide.

## 7. Evaluation

Use the frozen 25-case dataset.

Report:

- category accuracy;
- priority accuracy;
- valid output rate;
- median latency;
- p95 latency.

## 8. Where the model failed

This is a headline section, not a footnote.

Show at least 3-5 misses and classify the likely cause:

- model limitation;
- prompt weakness;
- taxonomy ambiguity;
- priority ambiguity;
- schema/output issue.

## 9. Cost

Report real GPU runtime and spend.

Separate:

- gross spend;
- credits;
- net out-of-pocket spend.

## 10. What this proves

Evidence of capability across:

- AI infrastructure;
- product thinking;
- trust/security boundaries;
- frontend UX;
- evaluation;
- cost awareness;
- technical documentation;
- education/reproducibility.

## 11. Limitations

Keep the limitations explicit:

- small English-only benchmark;
- on-demand GPU can be offline;
- no auth/database/RAG/agents/fine-tuning in v1;
- infrastructure providers still handle network/compute hosting;
- not a production-ready privacy guarantee.

## 12. Reproducibility package

Link to:

- live demo;
- GitHub;
- build guide;
- architecture/trust-boundary diagrams;
- frozen dataset;
- benchmark results;
- costs;
- screenshots;
- exact environment facts.
