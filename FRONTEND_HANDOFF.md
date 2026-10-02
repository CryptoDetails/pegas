# PEGAS FRONTEND HANDOFF v2

Date: 2026-10-02
Status: REDESIGNED SOURCE PREPARED / LOCAL BUILD VERIFICATION REQUIRED

## Why the frontend changed

Pegas is now framed as a self-hosted open-model proof, not primarily as a message-triage SaaS tool.

Message triage remains the interactive workload.

## Public routes

### `/` — Live Proof

Prepared:
- self-hosted-first hero;
- proof strip;
- message input and presets;
- `Run on my model` CTA;
- animated request-path visualization;
- structured result UI;
- `This inference` proof metadata panel;
- trust-boundary explanation;
- build-guide CTA.

### `/benchmark` — Measured Evidence

Prepared:
- fixed 25-case dataset;
- `Not run` metrics until real inference exists;
- dataset composition;
- case table;
- prominent future `Where the model failed` section.

### `/build` — Reproduce the Experiment

Prepared:
- six-step build path;
- why each stage exists;
- what the viewer should do/record;
- precise trust-boundary explanation.

## Preview truthfulness

Until real model integration exists:
- output is labeled as UI preview;
- compute says not connected;
- latency is not measured;
- schema validity is not claimed;
- benchmark scores are blank;
- preview request-path animation is clearly described as a visualization.

## Real integration still blocked by Stage 2

After successful RunPod/Ollama/Qwen smoke test:

- add `/api/analyze`;
- add `lib/prompt.ts`;
- add `lib/schema.ts`;
- add `lib/ollama.ts`;
- replace local preview result with real server response;
- populate model/GPU/runtime/latency/schema proof metadata;
- preserve the redesigned visual hierarchy.

## Verification required

Run from project root:

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Verify:
- `/`
- `/benchmark`
- `/build`
- mobile layout
- no fake live-inference claims
- no secrets/private endpoint data
