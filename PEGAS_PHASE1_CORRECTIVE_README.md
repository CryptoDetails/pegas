# PEGAS Phase 1 corrective patch

This patch is intended to be extracted directly over `C:\Pegas` after the first Phase 1 deployment.

## Fixes included

1. Fixes the invisible/white primary CTA. The CSS variable contains a gradient, but the original Tailwind arbitrary `bg-[var(--pegas-gradient)]` path treated it as a color. The patch uses a real background image class instead.
2. Adds unmistakable click/running feedback: spinner, `Running workflow...`, busy state, and a live status line.
3. Fixes the same gradient misuse on active workflow edges.
4. Makes Qwen structured output materially easier to satisfy:
   - model-facing nullable fields use empty strings instead of `anyOf` null branches;
   - validators normalize empty strings back to the Phase 1 `null` contract;
   - prompts explicitly allow empty evidence arrays and forbid paraphrased evidence;
   - repair instructions explain the exact safe fallback shapes;
   - JSON parsing tolerates harmless markdown fences or surrounding text before strict schema validation.
5. When structured validation fails after a real backend response, the SSE error now says that the backend responded and that validation was the failing layer.

## Not changed

- Modal `app.py`
- Vercel environment variable names
- legacy `/api/analyze`
- model/provider/runtime
- Phase 1 routing architecture

## Deploy gate

In VS Code Terminal from `C:\Pegas`:

```text
npm run build
```

If build succeeds:

```text
git add .
git commit -m "Fix Request Desk structured output and run feedback"
git push
```

Vercel deploys the pushed commit automatically.
