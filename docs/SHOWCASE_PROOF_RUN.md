# PEGAS SHOWCASE PROOF RUN v1

## Purpose

The technical smoke test proves that the infrastructure works. The Showcase Proof Run turns that technical fact into a simple, visual portfolio artifact.

Stage 2 should not be considered fully documented until both exist:

- technical evidence;
- human-readable visual proof.

## Input

Use one short business message that produces an obvious result:

> Hi, we are building a wallet and would like to integrate your swap API. Could your team share technical requirements and documentation?

Expected baseline label:

- category: `integration`
- priority: `medium`

## Required visual output

Capture one screen or short GIF showing:

```text
Your browser
  -> Pegas API
  -> Cloud GPU
  -> Ollama
  -> Qwen3 4B
  -> structured result
```

The result view should visibly contain:

- Category
- Priority
- Summary
- Recommended next action
- Model tag
- Actual GPU
- Runtime: Ollama
- Latency
- Structured output: valid
- Hosted LLM API: none in inference path

## Required proof facts

Record from the real session:

- actual GPU SKU;
- actual hourly price;
- Ollama version;
- exact model tag;
- latency for the proof request;
- whether the output passed the schema;
- date/time of the proof run;
- screenshot filename.

## Portfolio use

The same proof artifact should be reusable in:

- README hero section;
- portfolio case;
- beginner guide;
- blog article;
- social post / short demo clip.

## Rule

Do not manufacture a "live" proof from frontend preview data. Preview and live inference must remain visually distinguishable until the real endpoint exists.
