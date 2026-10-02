# PEGAS INFERENCE DESIGN FOUNDATION v2

## Role of inference in the project

Inference is not hidden implementation detail. It is one of the main proof surfaces of Pegas.

The final UI must be able to explain:

- which model produced the result;
- which GPU handled the request;
- which runtime served the model;
- how long the request took;
- whether the output passed the schema;
- that no hosted LLM API performed inference.

## Model task

Qwen3 classifies one incoming business message and returns:

- category;
- priority;
- concise summary;
- one concrete next action.

Allowed categories:

- integration
- support
- partnership
- marketing
- media
- billing
- other

Allowed priorities:

- low
- medium
- high

## Baseline system behavior

- classify by the primary action required now;
- use only explicit information from the message;
- do not infer hidden intent;
- one concise summary sentence;
- one concrete next action;
- return schema-constrained output.

## Baseline Ollama settings

- `stream: false`
- `think: false`
- `temperature: 0`
- structured output through JSON Schema

All settings must be verified against the real installed Ollama version.

## Proof metadata

The LLM does not generate proof metadata.

Server-side application logic adds:

- exact model tag;
- actual GPU label/configuration;
- runtime name;
- latency;
- schema-valid flag.

## Trust-boundary language

Allowed claim:

> The prompt is not sent to a third-party hosted LLM API. Inference runs on the GPU instance deployed for Pegas.

Required context:

> Vercel and RunPod still provide infrastructure.

Disallowed simplification:

> Your data never leaves your device.

## Smoke-test success

A technical smoke test succeeds when:

- Ollama API is reachable;
- Qwen3 responds;
- structured output parses and passes the expected schema;
- actual model tag and GPU are recorded;
- latency is measured.

A portfolio proof is complete only when that same fact is also captured as a human-readable Showcase Proof Run.
