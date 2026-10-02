# VERCEL DEPLOY CHECKLIST — PEGAS FRONTEND v2

This checklist is for the redesigned frontend preview.

## Before GitHub

1. Run `npm install`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Run `npm run dev`.
5. Verify `/`, `/benchmark`, and `/build`.
6. Verify desktop and mobile widths.
7. Confirm the preview does not claim a live GPU request occurred.
8. Confirm benchmark metrics remain `Not run`.
9. Confirm no `.env`, token, private endpoint, or confidential message is included.
10. Commit the generated `package-lock.json`.

## GitHub

Recommended repository name: `pegas`.

Do not commit:
- `.env`;
- `.vercel`;
- `node_modules`;
- `.next`;
- tokens/credentials;
- real confidential business messages.

## Vercel preview

1. Add New -> Project.
2. Import the GitHub repository.
3. Use the detected Next.js preset.
4. Keep repository root as Root Directory.
5. No model secrets are required for the frontend preview.
6. Deploy.

## Public preview checks

- hero clearly says self-hosted/open-model proof;
- proof strip distinguishes target/pending facts;
- `Run on my model` shows the visual request path;
- result is labeled as preview data;
- trust-boundary clarification is visible;
- `/benchmark` shows no fabricated scores;
- `/build` is useful without claiming unverified exact facts.

## After Stage 2 and real integration

Add server-side only:

```text
MODEL_BASE_URL=
MODEL_AUTH_TOKEN=
OLLAMA_MODEL=
GPU_LABEL=
```

Then:
- replace preview logic with real `/api/analyze`;
- confirm browser never calls RunPod directly;
- verify live inference proof metadata;
- remove preview-only copy where no longer needed;
- capture final screenshots/GIF.
