# PEGAS REQUEST DESK — PHASE 3 CODER TASK
Date: 2026-10-05
Mode: DEVELOPMENT
Repository root on owner machine: `C:\Pegas`

## 1. CURRENT VERIFIED BASELINE

Pegas is live on Vercel and the current production path is:

```text
Browser
  -> Next.js / Vercel
  -> POST /api/workflows/run
  -> Modal
  -> Ollama
  -> qwen3:4b on NVIDIA L4
```

Phase 1 is accepted and Phase 2 is deployed.

Verified Phase 1 behavior:
- Technical / Business / Finance normal routing works;
- Intake, selected Department Agent and Reviewer are separate real Qwen calls;
- SSE/backend events drive the UI;
- real handoffs exist;
- structured-output hardening is required for qwen3:4b reliability;
- credential-like input stops before any LLM call as `manual_review`;
- underspecified input can finish as `needs_information`;
- Final Request Card is live;
- first run after scale-to-zero is cold, later runs are faster.

Phase 2 adds one bounded Reviewer correction/reroute cycle and deterministic correction-path tests. Preserve it. Do not remove or weaken the Phase 2 correction helper/tests.

Important: Phase 2 is an incremental implementation and is not yet the final V3 role topology. This Phase 3 must improve the product toward V3 without replacing the working workflow wholesale.

## 2. PHASE 3 GOAL

Implement a bounded Phase 3 with THREE capabilities:

1. **Optional real Privacy Agent**
2. **Inspectable real handoffs**
3. **V3 navigation / homepage cleanup**

Do not add another unrelated capability.

Target normal path in this phase:

```text
preflight
  -> Intake
      -> normal request -----------------> selected Department -> Reviewer
      -> privacy review needed -> Privacy -> selected Department -> Reviewer
      -> needs information -------------------------------------> END
```

Phase 2 correction remains available after Reviewer:

```text
Reviewer #1
  -> approve -> END
  -> one correction/reroute -> Department -> Reviewer #2 -> terminal END
```

The Privacy branch is conditional and must be real. Do not call Privacy on every run.

## 3. NON-GOALS / DO NOT CHANGE

Do NOT:

- change model/provider/runtime;
- change `modal-poc/modal-poc/app.py`;
- change Modal lifecycle settings in this task;
- add LangChain, LangGraph, Python agent backend, DB, Redis, queue, WebSockets, checkpointing or durable resume;
- add real email/CRM/helpdesk actions;
- add a fake Human Approve button;
- add a fake Privacy Agent that is only frontend animation;
- remove Phase 2 correction behavior;
- weaken the credential-like pre-model stop;
- weaken `manual_review` safety floors;
- expose chain-of-thought;
- silently send more context to an agent than the UI handoff inspector shows;
- delete the historical benchmark dataset/results;
- rename old single-step benchmark metrics as multi-agent evaluation;
- rebuild the entire design system.

Do NOT refactor all Department Agents into the final V3 Routing role in this phase. That is a larger topology migration and must remain a separate later task. Phase 3 is an incremental bridge.

## 4. PRIVACY AGENT

Add one stable agent ID:

```text
privacy_agent
```

The Privacy Agent uses the same self-hosted `qwen3:4b` through the existing Modal transport.

### 4.1 When Privacy runs

Privacy MUST run when either:

- validated Intake sets `privacy_review_needed=true`;
- validated Intake confidentiality is `confidential`;
- deterministic preflight/sensitivity rules indicate non-secret sensitive content that is safe to inspect after sanitization.

Privacy MUST NOT run for:

- ordinary internal requests;
- credential-like input that already triggers the deterministic pre-model stop;
- any input already forced to terminal `manual_review` by deterministic policy.

If deterministic policy says `restricted`, policy wins. Do not let Privacy downgrade it and continue.

### 4.2 Privacy input

Privacy receives ONLY sanitized / already allowed data.

A reasonable projected input:

```ts
{
  sanitized_request,
  intake: {
    summary,
    request_type,
    department_candidate,
    priority,
    confidentiality,
    privacy_review_needed,
    route_reason,
    evidence,
    missing_information
  },
  deterministic_sensitivity_flags,
  confidentiality_floor
}
```

Never send raw pre-sanitized input.

### 4.3 Privacy structured result

Add a compact hardened contract such as:

```ts
type PrivacyDecision = {
  decision: "continue" | "manual_review" | "needs_information";
  confidentiality: "internal" | "confidential" | "restricted";
  safe_brief: string;
  reason: string;
  recipient_restrictions: string[];
  withheld_field_names: string[];
  evidence: string[];
  clarification_question: string | null;
};
```

Exact field names may vary slightly if the current code structure makes another naming cleaner, but semantics must remain.

Limits should be small and explicit:
- `safe_brief` max 400 chars;
- `reason` max 240 chars;
- `recipient_restrictions` max 4 entries;
- `withheld_field_names` max 8 entries;
- `evidence` max 3 entries;
- clarification one question only.

Keep the existing structured-output hardening philosophy:
- normalize safe formatting variations;
- do not fail a good run because of harmless empty/nullable formatting;
- keep semantic control fields strict;
- at most one repair attempt for Privacy;
- count repair against total call budget.

### 4.4 Privacy decision rules

After validated Privacy:

**continue**
- allowed only if deterministic policy floor is not `restricted`;
- build a reduced Privacy -> Department context;
- do not re-expand information removed by Privacy.

**manual_review**
- stop automatically;
- Department and Reviewer are skipped;
- Final Request Card clearly says manual review was required after privacy review.

**needs_information**
- stop;
- return exactly one clarification question;
- no Department / Reviewer call.

If Privacy returns `restricted`, force `manual_review` regardless of `decision`.

## 5. REAL CONTEXT REDUCTION

Privacy must change the actual data passed forward.

For a normal non-Privacy path, preserve the existing Phase 2 projected Department context.

For a Privacy path, Department should NOT automatically receive the full `sanitized_request`.

Use a reduced context such as:

```ts
{
  safe_brief,
  request_type,
  department_candidate,
  priority,
  confidentiality,
  route_reason,
  privacy_reason,
  recipient_restrictions,
  evidence
}
```

The exact object serialized into the Department model call MUST equal the `handoff_created.forwarded_context` shown to the user.

If `sanitized_request` is withheld, include it in `withheld_field_names`.

A correction/reroute after Privacy MUST preserve the Privacy restrictions. The correction loop must never reintroduce the fuller pre-Privacy context.

## 6. HANDOFF INSPECTOR

The current backend already emits real `handoff_created` events. Phase 3 must make them inspectable.

### Required UI

Add a compact Handoff Inspector driven only by real events.

For each real handoff show:

```text
Source -> Target
Why
What was passed
What was withheld
```

Required displayed fields:
- source agent;
- target agent;
- handoff reason;
- `forwarded_context`;
- `withheld_field_names`;
- created time or event sequence if useful.

Use the actual handoff payload. Do not reconstruct a prettier/different context client-side.

### Interaction

Keep the main UI clean.

Recommended:
- compact handoff rows/chips below the graph or result;
- clicking `View handoff` / a handoff row opens one detail card or drawer-like panel;
- no new UI framework;
- JSON may be rendered as readable key/value sections rather than raw developer console text, but values must remain faithful.

For a run with multiple handoffs, user can select which handoff to inspect.

For a Privacy path it must be obvious that Privacy reduced/withheld context before the next agent.

Do not expose system prompts, auth headers, tokens, raw pre-sanitized input or chain-of-thought.

## 7. BACKEND EVENT CONTRACT

Preserve all Phase 1/2 events.

Add events only if needed. A Privacy run should be visible using normal existing agent events:

```text
agent_started privacy_agent
agent_completed privacy_agent
handoff_created
```

A small explicit privacy event such as `privacy_checked` is allowed if it materially simplifies UI/state, but do not invent redundant noise.

All event rules remain:
- monotonic `seq`;
- unique `event_id`;
- no state transitions after terminal event;
- broken stream is not success;
- duplicate event IDs ignored client-side.

## 8. CALL BUDGET / DEADLINE

Phase 3 adds one possible Privacy call.

Keep the workflow bounded.

Logical maximum with Privacy + Phase 2 correction:

```text
Intake
Privacy
Department #1
Reviewer #1
Department correction/reroute
Reviewer #2
```

Each role may have at most ONE structured-output repair attempt.

Set a finite total attempt ceiling sufficient for this path. Do not create an unbounded retry loop.

Keep per-attempt timeout and total workflow deadline finite. If route duration changes, document the exact reason and exact value in `CODER_HANDOFF.md`.

Do not claim every cold six-call path is guaranteed to finish within a particular time unless verified.

## 9. V3 HOMEPAGE CLEANUP

Update the public homepage toward the approved V3 product story.

### Navigation

Top navigation must become:

```text
Demo
Guide
Blog
```

Rules:
- `/` = Demo;
- existing `/build` may stay as the URL but display label `Guide`;
- `/blog` = Blog;
- remove `Benchmark` from primary navigation;
- do not delete `/benchmark`.

A compact `Self-hosted Qwen` status/badge may remain if it is clearly not another navigation section.

### Headline

Change to:

```text
One request. The right team.
```

Use one short supporting sentence. Keep it product-first.

Do not put a long architecture explanation back on the homepage.

### Phase label

Use:

```text
Request Desk · Phase 3
```

### Activity timeline

The full Event Trace should NOT occupy permanent large vertical space.

Move it behind a control such as:

```text
View activity
```

Default collapsed after a completed run.

While a run is active, a compact current-status line remains visible.

### Examples

Add one privacy-oriented fictional example in addition to the normal routing examples so the new branch is discoverable.

Example text:

```text
This fictional request includes confidential partner pricing for an unreleased agreement. Please route it to the appropriate team without forwarding unnecessary details.
```

Selecting an example only fills the input. It must not start the workflow.

Keep the existing warning not to enter real passwords/API keys/personal data.

## 10. BENCHMARK CLEANUP

The old `/benchmark` is historical single-step triage evidence, NOT the evaluation of the current multi-agent Request Desk.

Required:

1. Remove Benchmark from primary header navigation.
2. Keep `/benchmark` route and historical results.
3. Add clear label near the top:

```text
Legacy single-step experiment
```

4. Add short explanation that the metrics predate the multi-agent Request Desk and are retained as historical/regression evidence.
5. Remove or de-emphasize the large public `Run 25-case benchmark again` CTA from the normal visitor path.
   - Do not delete evaluation logic if used internally.
   - Do not auto-run it.
6. Add a link from Guide to the legacy benchmark page.

Do not change the old measured values just to make the new product look better.

## 11. GUIDE CLEANUP

Keep the existing `/build` route if convenient, but present it as `Guide`.

Add a concise section explaining the current product path:

```text
Vercel -> Modal -> Ollama -> qwen3:4b
```

and the Request Desk concept:

```text
Intake -> optional Privacy -> Department -> Review
```

Make clear that:
- all AI roles share the same self-hosted model;
- Privacy is conditional;
- departments are simulated recipients / current incremental implementation;
- the legacy benchmark is historical.

Link to `/benchmark` as `Legacy benchmark`.

Do not rewrite the entire Guide or historical blog in this phase.

## 12. GRAPH BEHAVIOR

Extend the current graph minimally.

Show Privacy as a real optional node.

Required:
- normal request: Privacy becomes `NOT NEEDED` / skipped;
- privacy-triggered request: Privacy becomes active/completed;
- selected handoff edge pulses only on real backend `handoff_created`;
- Phase 2 reverse correction path still works;
- no staged timer pretending Privacy ran;
- no fake department changes.

Do not add React Flow or another graph library.

## 13. ACCEPTANCE TESTS

### A. Phase 1/2 regressions

These must still work:

**Technical**
```text
Our fictional partner API returns 401 after we rotated test credentials. Please help identify the technical next step for the integration team.
```

Expected: normal Technical flow.

**Business**
```text
A fictional wallet partner has reached out about a potential co-marketing campaign around its upcoming product launch. Please identify the right team and recommend the next step.
```

Expected: normal Business flow.

**Finance**
```text
A fictional partner says invoice INV-DEMO-104 appears to include the same service charge twice. Please review the billing request and suggest the next step.
```

Expected: normal Finance flow.

**Credential-like**
```text
Our fictional API key is sk-test-123456789. Please route this request to the right team.
```

Expected:
- deterministic pre-model `manual_review`;
- Privacy NOT called;
- Modal should not be woken by this branch.

**Underspecified**
```text
A fictional partner needs help with an issue. Please route it to the right team.
```

Expected:
- Intake -> `needs_information`;
- Privacy/Department/Reviewer skipped.

Phase 2 deterministic correction tests must still pass.

### B. Privacy branch

Use a fictional request such as:

```text
This fictional request includes confidential partner pricing for an unreleased agreement. Please route it to the appropriate team without forwarding unnecessary details.
```

Expected:
- Intake completes;
- Privacy runs for a real backend reason;
- Privacy handoff is visible;
- next agent receives the reduced context, not the original full request;
- Handoff Inspector displays the exact forwarded context and withheld fields;
- no credential-like preflight stop unless actual credential pattern exists.

### C. Privacy manual-review floor

Use a deterministic fixture/test where Privacy or policy floor is `restricted`.

Expected:
- no Department call;
- no Reviewer call;
- `manual_review`;
- no model output may downgrade restricted to internal/confidential and continue.

### D. Handoff inspector

For at least one normal run and one Privacy run:
- every displayed handoff comes from a real `handoff_created`;
- displayed `forwarded_context` equals what the next model call receives;
- withheld fields are visible;
- no hidden larger previous-agent payload is sent.

### E. Navigation

Verify:
- primary nav = Demo / Guide / Blog;
- no Benchmark item in primary nav;
- `/benchmark` still resolves;
- Guide links to legacy benchmark.

## 14. TESTING / QUALITY GATE

Before returning output:

```text
npm run lint
npm run build
```

Also run:
- existing Phase 2 deterministic correction tests;
- new deterministic Privacy/policy tests;
- any focused handoff projection tests needed to prove context reduction.

If a command fails, report it honestly. Do not call a failed build successful.

If real Modal credentials/environment are available, run at least:
- one normal Business or Finance smoke test;
- one privacy-triggered smoke test.

If unavailable, say `live smoke tests not performed`. Do not fake screenshots/events.

## 15. FILES LIKELY TO CHANGE

Likely backend:

```text
lib/workflow/types.ts
lib/workflow/events.ts
lib/workflow/prompts.ts
lib/workflow/schemas.ts
lib/workflow/orchestrator.ts
lib/workflow/sanitize.ts
lib/workflow/correction.ts        (preserve Phase 2 behavior)
app/api/workflows/run/route.ts    (only if duration/config genuinely changes)
```

Likely frontend:

```text
components/RequestDeskWorkspace.tsx
components/WorkflowGraph.tsx
components/WorkflowResultCard.tsx
components/AppHeader.tsx
components/HandoffInspector.tsx   (new, if useful)
app/page.tsx
app/globals.css
app/benchmark/page.tsx or existing benchmark components
app/build/page.tsx or existing Guide components
```

Tests:

```text
scripts/phase2-correction-tests.ts
scripts/phase3-privacy-tests.ts
```

Actual filenames may differ based on the current repository. Reuse existing structure instead of duplicating components.

## 16. OUTPUT PACKAGE

Return ONE ZIP preserving project-relative paths so the owner can extract it directly over:

```text
C:\Pegas
```

Include:
- changed/new source files;
- test files;
- `CODER_HANDOFF.md`.

Do NOT include:
- `.env`;
- secrets/tokens;
- `.venv`;
- `node_modules`;
- `.next`;
- `.git`;
- caches;
- nested input/output ZIPs.

`CODER_HANDOFF.md` must state:
- exact files changed;
- Privacy trigger semantics;
- exact Privacy result contract;
- how reduced context is built;
- how Handoff Inspector maps to real payload;
- whether route timeout/call budget changed;
- commands/tests run;
- lint result;
- build result;
- live smoke tests performed or not;
- known limitations.

## 17. SUCCESS DEFINITION

Phase 3 is complete when:

- all accepted Phase 1 behavior still works;
- Phase 2 correction/reroute remains bounded and working;
- Privacy is a real conditional Qwen role;
- obvious credentials still stop before Privacy/LLM;
- confidential non-secret input can take a real Privacy path;
- Privacy can reduce the actual context passed forward;
- restricted policy cannot be downgraded by the model;
- every handoff can be inspected as `who -> whom / why / what context / what withheld`;
- the inspector shows the same forwarded context actually used by the next model call;
- primary navigation is Demo / Guide / Blog;
- Benchmark is removed from primary navigation but preserved as legacy evidence;
- Event Trace is no longer the dominant permanent block;
- no fake timers/progress/agents are introduced;
- `npm run build` passes.
