# PEGAS Request Desk Phase 2 — Coder Handoff

Date: 2026-10-05

## What Phase 2 adds

Phase 2 preserves the accepted Phase 1 Request Desk and adds exactly one bounded Reviewer correction cycle.

Supported Reviewer #1 outcomes now include:

- first-pass approval -> normal `routed_demo`;
- `needs_information` -> terminal clarification outcome;
- manual-review or sensitivity escalation -> terminal `manual_review`;
- same-department `revise` -> one real Department revision call -> Reviewer #2;
- cross-department reroute -> one real target Department call -> Reviewer #2.

Reviewer #2 is terminal. If it approves, the final card uses the last valid DepartmentProposal. If it asks for another revision/reroute or otherwise cannot safely approve, the workflow ends without another model correction cycle.

## Changed / added files

Changed:

- `lib/workflow/types.ts`
- `lib/workflow/orchestrator.ts`
- `lib/workflow/prompts.ts`
- `components/RequestDeskWorkspace.tsx`
- `components/WorkflowGraph.tsx`
- `components/WorkflowResultCard.tsx`
- `app/globals.css`
- `package.json`
- `CODER_HANDOFF.md`

Added:

- `lib/workflow/correction.ts`
- `scripts/phase2-correction-tests.ts`

## Backend behavior implemented

- `MAX_LLM_ATTEMPTS` increased from 6 to 10 so the bounded five-logical-call path can still allow at most one structured-output repair per role.
- Total workflow deadline remains 180 seconds.
- Per-attempt timeout still uses the lesser of 120 seconds and remaining workflow time.
- No infinite correction loop is possible.
- Same-department correction sends a projected correction context to the same Department Agent with a revision-specific server prompt.
- Cross-department reroute sends the projected correction context only to the Reviewer-selected target Department.
- Correction context contains sanitized request, validated Intake, prior proposal, Reviewer public issues/reason/correction request, target department, and `correction_cycle: 1`.
- The exact correction/reviewer contexts serialized into model calls are the same objects exposed in their corresponding `handoff_created.forwarded_context` events.
- No raw pre-sanitized request is forwarded.
- Department confidentiality above `internal` stops as manual review before further correction/review.
- Reviewer public fields indicating sensitivity/privacy escalation stop as manual review.
- Phase 1 credential-like pre-model stop remains unchanged in principle: credential-like material is redacted and the request terminates before any LLM call.
- Deterministic underspecified-request floor remains in place.

## Event contract changes

Added public events:

- `revision_requested`
- `correction_started`
- `correction_completed`

Real `handoff_created` events remain mandatory for:

- Reviewer -> Department correction/reroute;
- corrected Department -> Reviewer #2.

Existing monotonic sequence IDs, unique event IDs, terminal event behavior, duplicate suppression, and interrupted stream handling remain intact.

## FinalRequestCard changes

Added:

- `initial_department`
- `revision_count` (`0 | 1`)

`department` remains the final department.

Examples now represented correctly:

- first-pass Business approval: initial Business, final Business, revision count 0;
- Technical revision: initial Technical, final Technical, revision count 1;
- Business -> Finance reroute: initial Business, final Finance, revision count 1.

## UI changes

- Badge changed from Phase 1 to Phase 2.
- Real `revision_requested` displays a compact revision/reroute status.
- Reviewer -> Department handoff pulses in reverse direction.
- Same Department can legitimately transition `completed -> running -> completed`.
- Reviewer can legitimately transition `completed -> running -> completed` for pass #2.
- Reroute keeps the first Department visibly completed while activating the new target Department.
- Final card shows `Revised once` or `Rerouted X -> Y` only when `revision_count=1`.
- Phase 2 events appear in the public event trace.

## Deterministic Phase 2 verification

Command run:

```text
npm run test:phase2
```

Result: PASS.

The local no-Modal test covers the required acceptance paths:

1. Reviewer #1 same-department revise -> exactly one Department correction call + Reviewer #2.
2. Reviewer #1 Business -> Finance reroute -> Finance only + Reviewer #2.
3. Reviewer #2 approval -> terminal approval after one correction.
4. Reviewer #2 asks to revise again -> terminal manual review with no third model cycle.
5. Sensitivity escalation before correction -> terminal manual review with zero correction calls.

A focused TypeScript type-check of the server/model/workflow files was also run with the globally available TypeScript compiler and empty external type roots:

```text
tsc --noEmit --pretty false --strict --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM --skipLibCheck --typeRoots /tmp/emptytypes /tmp/pegas_globals.d.ts lib/ollama.ts lib/workflow/types.ts lib/workflow/correction.ts lib/workflow/events.ts lib/workflow/prompts.ts lib/workflow/schemas.ts lib/workflow/sanitize.ts lib/workflow/orchestrator.ts
```

Result: PASS.

A syntax/transpile check was also run across workflow/API/components: 25 TS/TSX files, 0 syntax errors.

## Mandatory lint/build gate

Attempted dependency install:

```text
npm ci
```

The environment could not complete it because DNS access to npm failed with `EAI_AGAIN registry.npmjs.org`.

Commands then run exactly as required:

```text
npm run lint
npm run build
```

Results in this coder environment:

- `npm run lint`: NOT VERIFIED / failed to start because `eslint` was unavailable after the failed dependency install (`sh: eslint: not found`).
- `npm run build`: NOT VERIFIED / failed to start because `next` was unavailable after the failed dependency install (`sh: next: not found`).

These are environment/dependency-install failures, not successful lint/build results. Run both again on the owner machine after normal `npm ci` / existing project dependency setup.

## Live smoke tests

Not performed. The provided coder snapshot did not include usable production Modal/Vercel credentials, and this environment was not used to contact the live model transport.

Therefore:

- no live Business/Finance smoke result is claimed;
- no live correction/reroute is claimed;
- deterministic correction coverage is the evidence for the Phase 2 correction branches in this package.

## Regression protection checked

The following accepted Phase 1 / protected files were compared against the provided Phase 2 input snapshot and remain unchanged:

- `app/api/analyze/route.ts`
- `lib/ollama.ts`
- `lib/schema.ts`
- `lib/prompt.ts`
- `modal-poc/modal-poc/app.py`

No model/provider/runtime change was made. `/api/proof` was not changed. No LangChain/LangGraph, queue, Redis, DB, WebSocket, checkpointing, background job, or durable resume mechanism was added.

## Deploy / environment impact

No new environment variables are required.

No dependency version was changed and no new npm dependency was added.

`app/api/workflows/run/route.ts` keeps `maxDuration = 180`; Phase 2 deliberately relies on remaining-workflow-time budgeting and does not claim that a cold five-call correction path is guaranteed to complete within 180 seconds.

## Known limitation

The Phase 2 correction path is intentionally one cycle only. Reviewer #2 cannot trigger a third Department/Reviewer loop; such a result terminates safely as manual review (or needs information where applicable).
