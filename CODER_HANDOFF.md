# PEGAS REQUEST DESK — PHASE 3 CODER HANDOFF

Date: 2026-10-05
Baseline: provided `PEGAS_REQUEST_DESK_PHASE3_CODER_INPUT.zip`

## Implemented

Phase 3 adds exactly the requested capabilities while preserving the deployed Phase 1/2 architecture:

1. Real conditional `privacy_agent` using the existing self-hosted `qwen3:4b` Modal/Ollama transport.
2. Real Handoff Inspector driven directly by `handoff_created` payloads.
3. V3 homepage/navigation/Guide/legacy benchmark cleanup.

Phase 2 one-cycle reviewer correction/reroute remains intact and bounded.

## Files added

- `lib/workflow/privacy.ts`
- `components/HandoffInspector.tsx`
- `app/build/page.tsx`
- `scripts/phase3-privacy-tests.ts`

## Files changed

- `lib/workflow/types.ts`
- `lib/workflow/schemas.ts`
- `lib/workflow/prompts.ts`
- `lib/workflow/sanitize.ts`
- `lib/workflow/correction.ts`
- `lib/workflow/orchestrator.ts`
- `components/RequestDeskWorkspace.tsx`
- `components/WorkflowGraph.tsx`
- `components/AppHeader.tsx`
- `components/BenchmarkDashboard.tsx`
- `scripts/phase2-correction-tests.ts` (import extensions only so the existing Node strip-types test runs directly)
- `package.json` (adds `test:phase3` script)
- `CODER_HANDOFF.md`

## Privacy trigger semantics

Credential-like material remains terminal before any LLM call. It is redacted, marked `restricted`, and stops as `manual_review`; Intake and Privacy are skipped.

For non-secret input, Privacy runs after validated Intake when any of these is true:

- Intake returns `privacy_review_needed=true`;
- Intake returns `confidentiality=confidential`;
- narrow deterministic non-secret sensitivity detection finds confidential business terms such as explicit `confidential`, `partner pricing`, an unreleased agreement/contract/deal/terms, or NDA material.

`restricted` always wins. Intake `restricted`, deterministic `restricted`, or Privacy `restricted` cannot be downgraded by a model output.

## Privacy result contract

```ts
type PrivacyDecision = {
  decision: "continue" | "manual_review" | "needs_information";
  confidentiality: "internal" | "confidential" | "restricted";
  safe_brief: string;                    // max 400
  reason: string;                        // max 240
  recipient_restrictions: string[];     // max 4
  withheld_field_names: string[];       // max 8
  evidence: string[];                   // max 3, exact source substrings only
  clarification_question: string | null;
};
```

The same structured-output hardening pattern remains: safe normalization, strict semantic enums, optional/nullable normalization, at most one repair attempt.

## Real context reduction

Intake -> Privacy receives only sanitized request plus validated/safe Intake fields and deterministic sensitivity metadata.

When Privacy returns `continue`, Privacy -> Department receives a reduced object containing only:

- `safe_brief`
- `request_type`
- final `department_candidate`
- `priority`
- Privacy confidentiality
- Intake `route_reason`
- `privacy_reason`
- `recipient_restrictions`
- Privacy evidence

It does **not** receive `sanitized_request`.

The Privacy-path correction/reroute context is rebuilt from this reduced Privacy base plus the previous proposal and public Reviewer fields. It never reintroduces `sanitized_request` or the larger pre-Privacy Intake payload.

The second Reviewer pass also remains on the reduced context boundary.

## Handoff Inspector mapping

The client stores only actual `handoff_created` events. `HandoffInspector` renders the event payload directly:

- source agent -> target agent
- `reason`
- `forwarded_context`
- `withheld_field_names`

No alternate client-side context is reconstructed. System prompts, auth data, raw pre-sanitized input and chain-of-thought are not exposed.

## UI / navigation

- Primary navigation is now `Demo / Guide / Blog`.
- `/benchmark` remains available but is removed from primary navigation.
- `/benchmark` is labeled `Legacy single-step experiment` and explains that metrics predate the multi-agent Request Desk.
- The benchmark rerun CTA is visually de-emphasized and not auto-run.
- `/build` now exists as `Guide` and documents:
  - `Vercel -> Modal -> Ollama -> qwen3:4b`
  - `Intake -> optional Privacy -> Department -> Review`
  - all roles share the same self-hosted model
  - Privacy is conditional
  - departments are simulated recipients in the current incremental implementation
  - link to `Legacy benchmark`
- Homepage label is `Request Desk · Phase 3`.
- Headline is `One request. The right team.`
- Added a fictional Privacy preset; selecting it only fills the input.
- Activity/Event Trace is collapsed behind `View activity`; compact live status remains visible during runs.
- Graph adds real optional Privacy state and preserves Phase 2 reverse correction pulse.

## Budget / timeout

- Route `maxDuration` remains **180 seconds**.
- Workflow deadline remains **180 seconds**.
- Per-attempt maximum remains **120 seconds or remaining workflow time, whichever is lower**.
- Total LLM attempt ceiling changed from **10 -> 12** because the bounded Phase 3 maximum is six logical roles (`Intake`, `Privacy`, `Department #1`, `Reviewer #1`, `Department #2`, `Reviewer #2`) and each role may have at most one structured-output repair.
- No unbounded retry/correction loop was added.

## Verification performed

### Deterministic Phase 2 correction tests

Command:

```text
node --experimental-strip-types scripts/phase2-correction-tests.ts
```

Result: PASS — existing 5 acceptance paths.

### Deterministic Phase 3 Privacy/context tests

Command:

```text
node --experimental-strip-types scripts/phase3-privacy-tests.ts
```

Result: PASS.

Covered:

- non-secret confidential input triggers Privacy rather than credential stop;
- Privacy -> Department projection omits `sanitized_request`;
- Privacy correction/reroute projection still omits `sanitized_request`;
- Privacy `restricted` forces manual review even if decision says `continue`;
- deterministic `restricted` floor cannot be downgraded;
- credential-like input remains restricted and does not run Privacy.

### Modified TS/TSX syntax transpile check

Global TypeScript `transpileModule` was run over 15 changed/new TS/TSX files.

Result: PASS — 0 transpile diagnostics.

### Protected-file regression check

Byte comparison against the provided Phase 3 baseline confirmed unchanged:

- `app/api/analyze/route.ts`
- `lib/ollama.ts`
- `lib/prompt.ts`
- `lib/schema.ts`
- `modal-poc/modal-poc/app.py`

Route config remains:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
```

## npm lint/build status

Attempted dependency installation:

```text
npm ci --ignore-scripts --no-audit --no-fund
```

In this coder environment the online install did not complete and left no usable `eslint`/`next` executables. An offline retry confirmed the cache is incomplete:

```text
npm ci --offline --ignore-scripts --no-audit --no-fund
```

Result: FAILED with `ENOTCACHED` for `zod-validation-error-4.0.2.tgz`.

Therefore the requested commands were attempted but could not execute successfully in this environment:

```text
npm run lint
```

Result: NOT PASSED / environment dependency issue — `eslint: not found`.

```text
npm run build
```

Result: NOT PASSED / environment dependency issue — `next: not found`.

Do not treat the transpile/deterministic tests as a replacement for a real Next build. On the owner machine/CI, run `npm ci`, then `npm run lint`, `npm run build`, `npm run test:phase2`, and `npm run test:phase3` before deployment.

## Live smoke tests

Live Modal smoke tests not performed. This environment did not provide a verified deploy/runtime credential path for calling the production workflow, and no live correction or Privacy run is claimed.

## Known limitations

- The six-logical-call cold path is bounded but is not guaranteed to fit 180 seconds; the code always uses remaining workflow time.
- Privacy is an incremental Phase 3 role. Departments remain the existing Technical/Business/Finance simulated recipient profiles; this phase does not perform the later V3 Routing-role topology migration.
- Deterministic non-secret sensitivity detection is intentionally narrow and auditable rather than a broad PII detector.
