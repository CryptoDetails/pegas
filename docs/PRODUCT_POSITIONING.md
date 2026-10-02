# PEGAS PRODUCT POSITIONING v2

Date: 2026-10-02
Status: APPROVED DIRECTION

## Core idea

Pegas is not primarily an AI message-triage product.

Pegas is a portfolio proof that one person can deploy an open-source language model on rented cloud GPU infrastructure, expose it to a small web application, understand the trust boundary, measure the result, and explain the whole process well enough for another person to reproduce it.

The message-triage task is only the demonstration workload.

## One-sentence positioning

**Deploy your own open model in the cloud, see exactly where your data goes, and prove that the setup actually works.**

## What the project must prove

1. **Run it yourself** — an open model runs on a GPU instance selected and deployed by the project author.
2. **Own the inference path** — prompts are not delegated to a hosted third-party LLM API.
3. **Measure it** — latency, structured-output validity, benchmark accuracy, failures, and cost are recorded.
4. **Make it reproducible** — the case includes screenshots, exact steps, real settings, mistakes, and a beginner-friendly guide.

## Trust-boundary wording

Do not claim that data "goes nowhere" or that the system is fully private by default.

Preferred wording:

> Your prompt is not sent to a third-party hosted LLM API. Inference runs on the cloud GPU instance you deploy and control.

Required clarification:

> Vercel and RunPod still provide infrastructure. The difference is that model inference is not delegated to a hosted LLM provider.

## Audience reaction target

Within 3-5 seconds, a viewer should understand:

- this is a self-hosted/open-model experiment;
- there is a real cloud GPU behind it;
- no hosted LLM API is in the inference path;
- the result is measured rather than hand-picked;
- the viewer can learn how to repeat it.

## Evidence hierarchy

1. Live request path
2. Real model / GPU / runtime / latency metadata
3. Schema-valid structured result
4. Benchmark and real failures
5. Actual cost
6. Reproducible guide

## Product hierarchy

1. Self-hosted AI proof
2. Reproducibility / guide
3. Measured evidence
4. Message-triage demo workload

This hierarchy overrides the earlier message-triage-first framing.
