# PEGAS REQUEST DESK — PHASE 2 CODER TASK

Date: 2026-10-05
Mode: DEVELOPMENT
Repository root on owner machine: `C:\Pegas`

## 1. CURRENT ACCEPTED BASELINE

Phase 1 is live and accepted. Preserve it.

Current production path:

```text
Browser -> Next.js/Vercel -> /api/workflows/run -> Modal -> Ollama -> qwen3:4b
```

The working Phase 1 Request Desk supports:

- deterministic input sanitization and credential-like stop before any model call;
- Intake Agent;
- exactly one Technical / Business / Finance Department Agent;
- Reviewer Agent;
- real SSE/backend events;
- real handoffs whose `forwarded_context` is the context actually sent to the next model call;
- structured-output normalization/hardening for Qwen3 4B;
- successful Technical / Business / Finance routing;
- `manual_review` for credential-like/sensitive requests;
- `needs_information` for clearly underspecified requests;
- Final Request Card;
- current cold-start notice and run feedback.

DO NOT regress any of this.

## 2. PHASE 2 GOAL

Implement one real, bounded reviewer correction cycle.

Current Phase 1 ends `revise` / reviewer reroute requests as `manual_review`. Phase 2 must instead allow exactly ONE correction cycle:

```text
Intake
  -> Department A
  -> Reviewer #1
       -> approved -> final
       -> needs_information -> final
       -> manual_review / sensitivity escalation -> final manual review
       -> revise same department
             -> Department A revision
             -> Reviewer #2
             -> approved -> final
             -> anything else -> safe terminal outcome
       -> reroute to Department B
             -> Department B
             -> Reviewer #2
             -> approved -> final
             -> anything else -> safe terminal outcome
```

There must never be more than one correction/reroute cycle.

## 3. NON-GOALS / DO NOT CHANGE

Do NOT:

- change Modal `modal-poc/modal-poc/app.py`;
- change model/provider/runtime;
- add LangChain, LangGraph, queues, Redis, DB, WebSockets, checkpoints, background jobs, or durable resume;
- rebuild the whole UI;
- change legacy `/api/analyze` behavior;
- fix `/api/proof`;
- rewrite benchmark/blog/history pages;
- weaken the Phase 1 credential-like stop;
- weaken the deterministic `needs_information` floor;
- expose chain-of-thought;
- silently invent a revision/reroute when the Reviewer did not request one.

Keep the same Next.js + TypeScript + Modal transport architecture.

## 4. REQUIRED REVIEWER CORRECTION SEMANTICS

### A. Same-department revision

When Reviewer #1 returns:

```text
decision = revise
correction_target = null OR correction_target = currently selected department
```

and there is no sensitivity escalation:

1. Emit a real revision event.
2. Build a projected correction context for the same Department Agent.
3. Create a real `handoff_created` from Reviewer -> Department.
4. Call that Department Agent one more time using a revision-specific prompt/context.
5. Validate the revised DepartmentProposal with the existing hardened validation rules.
6. Create a real handoff Department -> Reviewer.
7. Call Reviewer #2.
8. Reviewer #2 is terminal. It cannot trigger another model correction cycle.

The Department correction context must include only data needed for the correction, e.g.:

```ts
{
  sanitized_request,
  intake,
  previous_department_proposal,
  reviewer_issues,
  reviewer_reason,
  correction_request,
  correction_cycle: 1
}
```

The exact serialized context sent to the model must equal `handoff_created.forwarded_context`.

### B. Cross-department reroute

When Reviewer #1 requests another allowed department:

```text
correction_target != currently selected department
```

and the target is Technical / Business / Finance and there is no sensitivity escalation:

1. Emit a real reroute/revision event.
2. Do NOT call the original Department again.
3. Build projected context for the target Department.
4. Create `handoff_created` Reviewer -> target Department.
5. Call the target Department Agent.
6. Validate that returned `department` equals the target.
7. Create Department -> Reviewer handoff.
8. Call Reviewer #2.
9. Reviewer #2 is terminal. No third Department/Reviewer loop.

The rerouted Department context must include:

- sanitized request;
- validated Intake;
- previous proposal;
- Reviewer #1 public issues/reason/correction request;
- target department;
- correction cycle number.

Do not send raw pre-sanitized input.

### C. Reviewer #2 terminal rules

If Reviewer #2 returns `approved` and deterministic policy checks pass:

- finish `routed_demo`;
- final card uses the LAST valid DepartmentProposal;
- final `department` is the actual final department;
- review status makes it clear approval happened after revision/reroute.

If Reviewer #2 returns `needs_information`:

- finish `needs_information`;
- return one concrete clarification question;
- no more calls.

If Reviewer #2 returns `revise`, another reroute target, `manual_review`, or sensitivity escalation:

- finish `manual_review`;
- reason must say the single correction cycle was exhausted OR sensitivity required manual review;
- no more calls.

## 5. SENSITIVITY / PRIVACY RULES MUST WIN

Phase 1 safety behavior remains higher priority than correction behavior.

At ANY point:

- credential-like input -> stop before model call as Phase 1 already does;
- `privacy_review_needed=true` from Intake -> manual review;
- Intake confidentiality above `internal` -> manual review;
- Department proposal confidentiality above `internal` -> manual review;
- Reviewer indicates sensitivity/privacy escalation -> manual review.

Never reroute sensitive content to another Department just because Reviewer requested it.

Do not add a fake Privacy Agent.

## 6. EXECUTION BUDGET

The current `MAX_LLM_ATTEMPTS = 6` was sized for Phase 1 and is not sufficient for a full correction path with one schema repair per role.

Update the bounded budget deliberately.

Required maximum logical calls:

```text
Intake
Department #1
Reviewer #1
Department #2 / revision
Reviewer #2
```

Each role may still have at most ONE structured-output repair attempt.

Set a clear total attempt ceiling sufficient for that bounded path but still finite. Recommended ceiling: `10` total LLM attempts.

Keep:

- total workflow deadline finite;
- per-attempt timeout finite;
- AbortSignal behavior;
- no calls after a terminal workflow state;
- no infinite loop under any model output.

If the existing 180-second total deadline is kept, ensure the code correctly uses remaining workflow time. Do not claim the full 5-call correction path is guaranteed to fit a cold 180-second window. If you increase the route `maxDuration`, document the exact value and keep it within the project's Vercel runtime capability. Prefer the smallest justified change.

## 7. EVENT CONTRACT EXTENSION

Preserve all current Phase 1 event types and semantics.

Add explicit public structured events for Phase 2. Recommended:

```ts
| "revision_requested"
| "correction_started"
| "correction_completed"
```

`revision_requested` payload should safely expose:

```ts
{
  cycle: 1,
  mode: "same_department" | "reroute",
  from_department: Department,
  target_department: Department,
  reason: string,
  issues: string[]
}
```

No chain-of-thought. `reason` and `issues` are the existing structured Reviewer fields only.

The normal real `handoff_created` events remain mandatory for Reviewer -> Department and Department -> Reviewer transitions.

Monotonic `seq`, unique `event_id`, terminal-state behavior, duplicate suppression, and interrupted-stream behavior must remain intact.

## 8. STATE / RESULT CONTRACT

Extend `FinalRequestCard` minimally so the user can see that correction happened.

Recommended fields:

```ts
initial_department: Department | null;
revision_count: 0 | 1;
```

The existing `department` remains the final department.

Examples:

- normal first-pass approval: `initial_department=business`, `department=business`, `revision_count=0`;
- same-dept revision: `initial_department=technical`, `department=technical`, `revision_count=1`;
- reroute: `initial_department=business`, `department=finance`, `revision_count=1`.

Do not change the meaning of existing `outcome` values unless genuinely necessary.

## 9. DEPARTMENT REVISION PROMPT

Do not reuse the normal Department prompt blindly.

Add a concise server-side revision instruction that tells the selected Department Agent:

- this is correction cycle 1 of 1;
- preserve facts from sanitized request;
- address Reviewer issues only;
- do not invent actions already taken;
- return the same DepartmentProposal contract;
- returned `department` must equal the target profile;
- evidence remains optional and if used must be verbatim source substrings.

Keep current structured-output hardening. Do not return to brittle exact-shape parsing.

## 10. FRONTEND / GRAPH

Keep the existing design. Add only what is needed to make the correction loop visibly real.

Required behavior:

1. Change badge/copy from `Phase 1` to `Phase 2` after implementation.
2. On real `revision_requested`:
   - show a compact visible status such as `Reviewer requested one revision` or `Reviewer rerouted Business → Finance`;
   - do not fake progress with timers.
3. Reviewer -> Department correction/reroute handoff must visibly pulse in the REVERSE direction.
4. Same-department revision:
   - the same Department node becomes active again;
   - Reviewer can become active a second time after the revised proposal.
5. Cross-department reroute:
   - keep the first Department visibly completed;
   - activate the new target Department;
   - update selected route to final target without pretending the first route never happened.
6. Final card should show, only when revision_count=1:
   - `Revised once` for same department; OR
   - `Rerouted Business → Finance` for cross-department reroute.
7. Event trace must show the new Phase 2 events.

Do not create a complicated graph library. Extend the existing component/CSS.

## 11. IMPORTANT UI STATE DETAIL

A node may run more than once in Phase 2, especially Reviewer.

Do not implement node state as a one-way state machine that refuses:

```text
completed -> running -> completed
```

for a legitimate second Reviewer pass or same-Department revision.

The UI reducer must accept the real backend event order.

## 12. PHASE 1 REGRESSION ACCEPTANCE

These existing cases MUST still work exactly as before:

### Normal Technical

```text
Our fictional partner API returns 401 after we rotated test credentials. Please help identify the technical next step for the integration team.
```

Expected normal route:

```text
Intake -> Technical -> Reviewer -> routed_demo
```

### Normal Business

```text
A fictional wallet partner has reached out about a potential co-marketing campaign around its upcoming product launch. Please identify the right team and recommend the next step.
```

Expected:

```text
Intake -> Business -> Reviewer -> routed_demo
```

### Normal Finance

```text
A fictional partner says invoice INV-DEMO-104 appears to include the same service charge twice. Please review the billing request and suggest the next step.
```

Expected:

```text
Intake -> Finance -> Reviewer -> routed_demo
```

### Sensitive pre-model stop

```text
Our fictional API key is sk-test-123456789. Please route this request to the right team.
```

Expected:

```text
manual_review before any LLM call
```

All agents skipped. Do not wake Modal for this branch.

### Underspecified

```text
A fictional partner needs help with an issue. Please route it to the right team.
```

Expected:

```text
Intake -> needs_information
```

No Department or Reviewer model call.

## 13. PHASE 2 ACCEPTANCE

Because live model outputs cannot be guaranteed to request a revision on demand, acceptance has TWO layers.

### A. Deterministic code-path verification

Refactor the post-review decision logic enough that the following branches can be exercised with deterministic local fixtures/mocks WITHOUT contacting Modal:

1. Reviewer #1 `revise`, same department -> exactly one Department revision -> Reviewer #2.
2. Reviewer #1 reroute Business -> Finance -> Finance only -> Reviewer #2.
3. Reviewer #2 `approved` -> routed_demo with `revision_count=1`.
4. Reviewer #2 asks to revise again -> manual_review, zero additional model calls.
5. Sensitivity escalation before correction -> manual_review, zero correction calls.

Do not add a heavy test framework just for this. A small pure decision helper plus focused TypeScript/Node test script is acceptable if the project has no test harness.

### B. Live smoke tests

Run at least the Phase 1 normal Business and Finance cases against the real workflow if credentials/environment are available.

If the live Reviewer naturally requests a revision/reroute, capture that run. If it does not, DO NOT fake one and DO NOT claim a live correction proof occurred.

In `CODER_HANDOFF.md`, explicitly state:

- deterministic correction tests performed;
- live smoke tests performed or not performed;
- whether a live correction/reroute happened naturally;
- exact commands run;
- lint/build status.

## 14. FILES LIKELY TO CHANGE

Expected core files:

```text
lib/workflow/types.ts
lib/workflow/events.ts
lib/workflow/orchestrator.ts
lib/workflow/prompts.ts
lib/workflow/schemas.ts    (only if result contract validation needs extension)
components/RequestDeskWorkspace.tsx
components/WorkflowGraph.tsx
components/WorkflowResultCard.tsx
app/globals.css            (only minimal animation/state additions)
app/api/workflows/run/route.ts (only if duration/config must change)
```

Add small test/helper files only if useful.

Do not touch unrelated files just to reformat them.

## 15. BUILD / QUALITY GATE

Before returning output:

```text
npm run lint
npm run build
```

If lint has a known pre-existing issue, document it precisely. Do not call a failed lint successful.

Also run the deterministic Phase 2 correction tests required above.

## 16. OUTPUT PACKAGE

Return ONE ZIP preserving project-relative paths so the owner can extract it directly over `C:\Pegas`.

Include:

- changed/new source files only OR a complete project snapshot if your environment requires it;
- `CODER_HANDOFF.md` with exact changed files, tests, build result, limitations, and whether live correction was observed;
- no `.env`;
- no `.venv`;
- no `node_modules`;
- no `.next`;
- no `.git`;
- no credentials/tokens;
- no nested input/output ZIPs inside the returned code tree.

## 17. SUCCESS DEFINITION

Phase 2 is complete when:

- Phase 1 accepted branches still pass;
- Reviewer can request one same-department correction and the workflow performs it for real;
- Reviewer can request one cross-department reroute and the workflow performs it for real;
- the second Reviewer pass is terminal;
- no infinite loop is possible;
- all correction transitions are backed by real events and real model calls;
- exact handoff context remains auditable;
- UI visibly reflects real reverse handoff/reroute events;
- structured-output hardening remains intact;
- safety/manual-review rules still override correction logic.
