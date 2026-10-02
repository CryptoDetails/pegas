# PEGAS ARCHITECTURE DIAGRAM SPECIFICATION v2

## Goal

The portfolio needs two diagrams, not one.

One explains the technical request path. The second explains the trust boundary in non-engineering language.

## Diagram A — Request path

```text
Browser
  -> Next.js UI
  -> POST /api/analyze
  -> Vercel / Next.js server route
  -> RunPod GPU
  -> Ollama
  -> Qwen3 4B
  -> schema validation + latency measurement
  -> result in UI
```

Must communicate:

- browser never calls RunPod directly;
- credentials stay server-side;
- model output is structured;
- latency is measured;
- GPU can be intentionally offline between demo sessions.

## Diagram B — Where does your prompt go?

```text
YOU
 |
 v
Pegas frontend
 |
 v
Your server-side route
 |
 v
Your rented GPU
 |
 v
Qwen3
```

Adjacent callout:

```text
Hosted LLM provider
OpenAI / Anthropic / similar

NOT IN THE INFERENCE PATH
```

Required clarification:

`Infrastructure is still hosted by Vercel and RunPod. The difference is that model inference is not delegated to a hosted LLM API.`

## Visual direction

- white/off-white background;
- dark slate text;
- blue for the active request path;
- one green proof callout for "not in path";
- simple rounded rectangles and arrows;
- readable by a non-engineer in under 10 seconds;
- no futuristic AI decoration.

## Evidence labels added only after the real run

- actual GPU;
- exact model tag;
- measured latency;
- actual auth mechanism;
- actual cost.
