# PEGAS BEGINNER GUIDE — OUTLINE v2

Working title:

**How I Put an Open LLM on My Own Cloud GPU — and Built a Web App Around It**

Audience: people comfortable with VS Code and service UIs, but without ML-engineering experience.

## Editorial promise

By the end, the reader should understand:

- what they are renting;
- where the model runs;
- where their prompt goes;
- what Ollama does;
- how to prove the model API works;
- how to connect a web app without exposing secrets;
- how much the experiment actually cost;
- how to turn the GPU off and stop paying.

## 1. The experiment in one picture

Show:

`GPU -> Ollama -> Qwen3 -> API -> Next.js -> benchmark`

Explain that message triage is only the test workload.

## 2. What "self-hosted" means here

Explain the trust boundary precisely.

Do not claim that the prompt never touches cloud infrastructure.

Explain:

- RunPod hosts compute;
- Vercel hosts the web/server route;
- no hosted LLM API performs inference.

## 3. What you need before starting

- VS Code
- GitHub
- RunPod
- Vercel
- small GPU budget

Include a simple cost-control checklist.

## 4. Rent the GPU

Explain Pod vs Serverless in this project.

Show screenshots for:

- template;
- GPU;
- price;
- storage;
- port/env setup.

Record actual values.

## 5. Install Ollama and pull the model

Explain what Ollama is in plain language.

Show exact commands from the real session.

Record exact Ollama version and model tag.

## 6. Prove the model works before building the app

Show:

- local API request;
- external API request;
- structured-output request;
- first successful JSON;
- measured latency.

Explain why this gate saves debugging time.

## 7. Create the Showcase Proof Run

Capture the request path and the first human-readable result with:

- model;
- GPU;
- runtime;
- latency;
- schema-valid status;
- hosted LLM API: none in path.

## 8. Build the web interface

Explain the three public routes:

- Live Proof
- Benchmark
- Build Guide

Show why the loading state visualizes the request path rather than a generic spinner.

## 9. Connect the model safely

Explain:

`Browser -> Next.js server route -> RunPod/Ollama`

Cover server-side env variables and why secrets never use `NEXT_PUBLIC_*`.

## 10. Make failure understandable

Show model offline, timeout, invalid output, generic error.

Explain why a stopped GPU is an expected state in an on-demand portfolio demo.

## 11. Measure instead of cherry-picking

Explain the frozen 25-case dataset and labeling rubric.

Show metrics and real failures.

## 12. What did it cost?

Use actual `COST_LOG.md` values only.

Show gross spend, credits, net spend, GPU runtime, and optional storage.

## 13. What broke and what I learned

Document real friction, unavailable GPUs, setup mistakes, prompt/taxonomy problems, and the fixes.

## 14. How to reproduce the exact build

Final checklist:

- GPU SKU;
- hourly price;
- region;
- template;
- model tag;
- Ollama version;
- endpoint pattern;
- environment variable names;
- repository commit;
- benchmark dataset;
- costs;
- limitations.
