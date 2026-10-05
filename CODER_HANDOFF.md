# PEGAS REQUEST DESK — PHASE 1 CODER HANDOFF

Date: 2026-10-05

## Files added

- `app/api/workflows/run/route.ts`
- `lib/workflow/types.ts`
- `lib/workflow/schemas.ts`
- `lib/workflow/prompts.ts`
- `lib/workflow/sanitize.ts`
- `lib/workflow/events.ts`
- `lib/workflow/orchestrator.ts`
- `components/RequestDeskWorkspace.tsx`
- `components/WorkflowGraph.tsx`
- `components/WorkflowResultCard.tsx`
- `public/brand/pegas-logo.png` (copied unchanged from `brand/PEGAS_LOGO_CANONICAL.png`)
- `CODER_HANDOFF.md`

## Files changed

- `lib/ollama.ts`
- `app/page.tsx`
- `components/AppHeader.tsx`
- `app/layout.tsx`
- `app/globals.css`

## Exact behavior implemented

- Added `POST /api/workflows/run` using Node runtime, forced dynamic execution, `maxDuration = 180`, and `text/event-stream` SSE output.
- First workflow events are emitted before the first model await.
- Added deterministic Phase 1 orchestration: input check -> Intake -> exactly one Technical/Business/Finance agent -> Reviewer -> final request card.
- Each Intake, Department profile, and Reviewer call uses a distinct server-side system prompt and a real separate Qwen/Ollama request.
- Preserved the existing Modal `/api/generate` transport, model configuration, bearer auth, and legacy `/api/analyze` contract.
- Refactored `lib/ollama.ts` with a small server-only generic structured-model adapter while keeping `runOllamaTriage()` behavior mapped to the existing legacy error contract.
- New agent calls keep `stream:false`, `think:false`, `temperature:0`, and cap `num_predict` at 600.
- Added strict manual runtime validation: exact top-level fields, enum checks, length limits, max 3 evidence entries, and exact-substring evidence validation against sanitized request text.
- Invalid structured agent output receives at most one deterministic repair retry for the same role. Retries count toward the six-call total budget.
- Added 180s workflow deadline, 120s maximum per model attempt, six total LLM-attempt cap, and AbortSignal forwarding. Stream cancellation aborts future/in-flight fetches where supported by the runtime.
- Added narrow secret masking for password/API-key/Bearer/common token-prefix patterns. Only the secret value is replaced with `[REDACTED_SECRET]`; SSE metadata contains flag types only.
- Any detected secret, Intake privacy review flag, or confidentiality above `internal` stops after Intake as `manual_review`; no department call and no fake Privacy Agent.
- Unknown/unsafe routing ends `needs_information` after Intake with one clarification question.
- Reviewer `revise`, manual-review, sensitivity escalation, or alternate-department requests stop as `manual_review`; no Phase 2 reroute/correction loop is simulated.
- Added real handoff objects. `forwarded_context` is the exact object serialized into the next model prompt; raw pre-sanitized input is never forwarded.
- Added event IDs and monotonic per-run sequence numbers; terminal event factory prevents state transitions after workflow completion/failure.
- Frontend consumes backend SSE events, ignores duplicate `event_id`s, and treats a stream ending without a terminal event as `Interrupted` rather than success.
- Homepage replaced with bounded Request Desk UI, fictional Technical/Business/Finance presets, cold-start notice, safety warning, live workflow graph, event trace, and final request card.
- Graph states and handoff animation are triggered by real backend events, not staged agent timers.
- Canonical Pegas logo is copied to `public/brand/pegas-logo.png`; header, metadata, CTA, graph, and reusable blue/cyan/violet accent tokens are updated without making the whole site gradient-heavy.

## Verification

### Required `npm run lint`

Not completed in this coder environment. The provided snapshot correctly excludes `node_modules`. `npm ci` was attempted from the existing lockfile, but the environment could not resolve `registry.npmjs.org` (`EAI_AGAIN`), so ESLint could not be installed/executed.

### Required `npm run build`

Not completed for the same dependency-install/network limitation above.

### Additional checks actually performed

- TypeScript/TSX syntax transpile check across project source: PASS (using the locally available TypeScript compiler API, excluding `.d.ts`).
- Deterministic source checks: PASS for workflow route `maxDuration=180`, SSE frame marker, `stream:false`, `think:false`, `temperature:0`, `num_predict` cap, and no `privacy_agent` implementation.
- Output package reviewed to exclude `node_modules`, `.next`, `.env`, nested ZIPs, and cache artifacts.

## Live tests actually performed

None. Live Modal/Vercel credentials and a completed dependency install were not available in this coder environment. No mock run is presented as live proof.

## Anything not verified

- Full Next.js type-check/build in the exact project dependency environment.
- ESLint in the exact project dependency environment.
- Live Technical -> Reviewer route.
- Live Business/Finance -> Reviewer route.
- Live cold-start timing and first-event delivery against deployed Modal.
- Live credential-redaction run against deployed Modal.

## Env / deploy impact

- No environment variable names were added or changed.
- No secrets are included.
- No dependency versions or package manifests were changed.
- Deployment still requires the existing `MODEL_BASE_URL`, `OLLAMA_MODEL`, `MODEL_AUTH_TOKEN` (when configured), and legacy `GPU_LABEL` for `/api/analyze` output.
- New workflow uses the same authenticated Modal `/api/generate` transport.

## Known limitation

Phase 1 is intentionally bounded: no Privacy Agent, no reviewer correction/rerouting loop, no persistence/checkpoints/queue, no durable approvals, and no resume after network interruption.
