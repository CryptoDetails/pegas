# PEGAS UI/UX SPECIFICATION v2

Status: APPROVED REDESIGN BASELINE
Project goal: self-hosted open LLM proof + reproducible guide

## 1. Product story

The interface must communicate the project in this order:

1. **This is an open model running on the author's cloud GPU.**
2. **The prompt is not sent to a hosted third-party LLM API.**
3. **The viewer can watch the request path.**
4. **The result is measured and structured.**
5. **The viewer can reproduce the setup.**

Message triage is the demonstration workload, not the product identity.

## 2. Routes

- `/` — Live Proof Demo
- `/benchmark` — Measured Evidence
- `/build` — Reproduce the Experiment

No auth, history, database, RAG, agents, model selector, prompt editor, or GPU-control dashboard in v1.

## 3. Main route `/`

### Hero

Eyebrow:

`SELF-HOSTED OPEN LLM / PORTFOLIO PROOF`

Headline:

**Your own open model. On your own cloud GPU.**

Supporting copy:

`Pegas shows the full path from renting a GPU to a working web app, without sending prompts to a hosted third-party LLM API.`

### Proof strip

Three compact facts:

- Open model — Qwen3 4B
- Cloud compute — RunPod GPU
- Hosted LLM API — None

Before the real proof run, unverified facts must be labeled as target/pending.

### Demo input

Heading: **Try the model**

CTA: **Run on my model**

Presets remain Integration / Support / Partnership / Media.

### Loading / wow state

Do not show only a spinner.

Show the request path becoming active step-by-step:

```text
Browser -> Pegas API -> Cloud GPU -> Ollama -> Qwen3 4B
```

This is both the loading state and the architecture explanation.

### Result

Keep:

- category;
- priority;
- summary;
- recommended next action.

Add a high-contrast **This inference** proof panel:

- model;
- compute;
- runtime;
- latency;
- schema-valid status;
- hosted LLM API: none in inference path.

### Trust-boundary card

Show:

```text
Your browser
  -> Next.js server route
  -> RunPod GPU
  -> Ollama
  -> Qwen3 4B
```

Beside or below it:

`Hosted LLM provider: NOT IN THE REQUEST PATH`

Clarification:

`Vercel and RunPod still host infrastructure. Model inference itself is not delegated to a hosted LLM API.`

### What just happened

Four short cards:

1. You sent a message.
2. Pegas routed it server-side.
3. The open model processed it on the rented GPU.
4. Validated structured JSON returned to the browser.

### Build-it-yourself block

Show the six-step path and CTA to `/build`.

## 4. Benchmark route `/benchmark`

Hero:

**Measured, not cherry-picked.**

Required metrics:

- Category accuracy
- Priority accuracy
- Valid output
- Median latency
- P95 latency as secondary metadata if useful

Add a prominent section:

### Where the model failed

After the real run, show 3-5 actual misses with:

- input;
- expected;
- model output;
- likely cause;
- model vs prompt vs taxonomy conclusion.

Failed cases must remain visible.

## 5. Build route `/build`

Purpose: give a viewer immediate practical value even before reading the long-form blog guide.

Show six stages:

1. Rent a GPU
2. Run Ollama
3. Pull Qwen3 4B
4. Prove the API
5. Connect Next.js server-side
6. Benchmark, record cost, deploy

Each stage should include:

- why it exists;
- what to do;
- what fact to record.

Do not show unverified exact costs, timings, tags, or screenshots as if final.

## 6. Visual direction

- clean engineering/product aesthetic;
- off-white / white / slate with one blue accent;
- no neon, robots, starfields, 3D servers, or generic AI imagery;
- large typography but low visual noise;
- animation only when it explains state or request flow;
- screenshots should remain useful inside articles and README.

## 7. Preview-mode rule

A frontend-only preview may be deployed before the GPU proof run, but it must clearly distinguish:

- local UI preview;
- live model inference.

Never show fake GPU, latency, benchmark, or schema evidence.

## 8. Acceptance criteria

The final public demo is successful when a new viewer can answer, without explanation:

- What is self-hosted here?
- Where does the prompt go?
- Is a hosted LLM API involved?
- Which model/GPU handled the request?
- How fast was it?
- Was the result structured correctly?
- How well did it perform on the benchmark?
- How can I reproduce it?
