# PEGAS REQUEST DESK — CODER TASK / PHASE 1 VERTICAL SLICE

Date: 2026-10-05
Mode: DEVELOPMENT
Repository root on owner machine: `C:\Pegas`

## 1. Factual baseline

Pegas is already live and the current production inference path works:

```text
Browser -> Next.js/Vercel -> Modal -> Ollama -> qwen3:4b
```

The current legacy endpoint is:

```text
POST /api/analyze
```

It calls `runOllamaTriage()` from `lib/ollama.ts`, which sends a structured `stream:false`, `think:false`, `temperature:0` request to the existing authenticated Modal `/api/generate` transport.

Do NOT re-bootstrap Modal, change provider, change model, add a Python agent backend, add LangChain/LangGraph, or replace Ollama.

The new multi-agent Request Desk has NOT been implemented yet. This task creates the first bounded vertical slice only.

## 2. TASK

Implement the first real Pegas Request Desk workflow:

```text
Input validation / secret masking
        -> Intake Agent
        -> exactly one selected Department Agent
           (Technical OR Business OR Finance)
        -> Reviewer Agent
        -> Final Request Card
```

The workflow must use separate real Qwen calls with separate prompts for Intake, each Department profile, and Reviewer. The frontend must be driven by real backend workflow events, not staged timers.

Two different normal requests must be able to route to two different Department profiles in live execution.

Phase 1 also needs a safe bounded branch:

- obvious secret/credential-like input, `restricted` input, `privacy_review_needed=true`, or any Intake confidentiality above `internal` MUST stop as `manual_review` before a Department call;
- do not pretend a Privacy Agent exists yet;
- unknown/insufficient routing may end as `needs_information` after Intake;
- Reviewer corrections/re-routing loops belong to Phase 2. If Reviewer returns `revise` or requests another Department in Phase 1, finish as `manual_review` with the reason rather than silently changing the department or starting a fake correction cycle.

## 3. Existing files that MUST remain compatible

Preserve the existing legacy path:

- `app/api/analyze/route.ts`
- `lib/ollama.ts` public behavior of `runOllamaTriage()`
- `lib/prompt.ts`
- `lib/schema.ts`
- current seven-category legacy triage contract

The new workflow gets its own types, schemas, prompts, events, and route.

`modal-poc/modal-poc/app.py` must NOT be changed in this task. The existing Modal `/api/generate` transport is enough.

Do not fix `/api/proof` in this task. It is a separate known issue.

Do not rewrite benchmark/blog/history content in this task.

## 4. Required API

Add:

```text
POST /api/workflows/run
Content-Type: application/json
Body: { "message": "..." }
Response: text/event-stream
```

Use Next.js Node runtime.

Set:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
```

The first SSE event must be emitted before waiting for the first LLM call.

Suggested SSE frame format:

```text
event: workflow_event
data: {JSON}

```

A heartbeat is allowed while waiting, but heartbeat MUST NOT be presented as agent progress.

## 5. Workflow event contract

Every workflow event:

```ts
type WorkflowEvent = {
  event_version: 1;
  run_id: string;
  event_id: string;
  seq: number;
  type:
    | "workflow_started"
    | "input_checked"
    | "agent_started"
    | "agent_completed"
    | "agent_failed"
    | "agent_skipped"
    | "routing_decision"
    | "handoff_created"
    | "review_completed"
    | "policy_checked"
    | "workflow_completed"
    | "workflow_failed"
    | "heartbeat";
  timestamp: string;
  step_id: string;
  agent_id: string | null;
  payload: unknown;
};
```

Backend assigns `seq` and unique `event_id` monotonically per run.

After a terminal event (`workflow_completed` or `workflow_failed`) no more state transitions may be emitted.

Frontend must ignore duplicate `event_id` values and must not treat a broken/interrupted stream as success.

## 6. Agent IDs

Use these stable IDs:

```text
intake_agent
technical_agent
business_agent
finance_agent
reviewer_agent
```

Do NOT add `privacy_agent` in Phase 1.

## 7. Structured contracts

### IntakeAssessment

```ts
type Department = "technical" | "business" | "finance";
type Priority = "low" | "medium" | "high";
type Confidentiality = "internal" | "confidential" | "restricted";

type IntakeAssessment = {
  summary: string;
  request_type: string;
  department_candidate: Department | "unknown";
  priority: Priority;
  confidentiality: Confidentiality;
  privacy_review_needed: boolean;
  route_reason: string;
  evidence: string[];
  missing_information: string[];
  clarification_question: string | null;
};
```

### DepartmentProposal

```ts
type DepartmentProposal = {
  department: Department;
  summary: string;
  priority: Priority;
  confidentiality: Confidentiality;
  department_note: string;
  next_action: string;
  open_questions: string[];
  evidence: string[];
};
```

### ReviewDecision

```ts
type ReviewDecision = {
  decision: "approved" | "revise" | "manual_review" | "needs_information";
  issues: string[];
  correction_target: Department | null;
  correction_request: string | null;
  reason: string;
  evidence: string[];
};
```

### FinalRequestCard

```ts
type FinalRequestCard = {
  run_id: string;
  outcome: "routed_demo" | "manual_review" | "needs_information";
  department: Department | null;
  priority: Priority | null;
  confidentiality: Confidentiality | null;
  summary: string | null;
  department_note: string | null;
  next_action: string | null;
  route_explanation: string;
  review_status: string;
  clarification_question: string | null;
};
```

A technical failure is NOT a fake `FinalRequestCard`; emit `workflow_failed` with a separate safe error payload.

## 8. Validation rules

Implement manual runtime validation; do not add a dependency just for schemas.

Minimum limits:

- input: non-empty string, trim whitespace;
- input maximum: 4,000 characters;
- summary max: 300 chars;
- reason / route_reason max: 240 chars;
- next_action max: 300 chars;
- department_note max: 500 chars;
- evidence max 3 entries per agent result;
- each evidence entry max 180 chars;
- each evidence string must be an exact substring of the sanitized request; otherwise reject that model output as invalid;
- unexpected enum values are invalid;
- unexpected top-level fields in model structured objects are invalid.

For invalid JSON/schema/evidence from an agent, allow at most ONE retry for that same role with the same deterministic request plus a concise server-side repair instruction. Every retry counts toward the total call budget.

If validation still fails, emit `agent_failed` and `workflow_failed`. Do not invent a result.

## 9. Input sanitization / Phase 1 confidentiality floor

Before any LLM call, detect and mask obvious credential-like material. Keep this intentionally narrow and auditable.

At minimum detect values in patterns like:

- `password: ...` or `password=...`
- `api key: ...`, `api_key=...`, `apikey: ...`
- `Authorization: Bearer ...` / `Bearer ...`
- common token prefixes such as `sk-`, `ghp_`, `wk-`, `xoxb-`, `xoxp-`, `xoxa-`, `xoxr-`

Replace only the secret value with a stable marker such as `[REDACTED_SECRET]`.

Store only flag TYPES, never the detected secret value.

If any secret flag is present, confidentiality floor becomes `restricted` and Phase 1 must stop after Intake as `manual_review`; no Department Agent call.

Do not mask ordinary business text merely because it contains an email address. UI warning covers real personal data.

Never put raw secret values into SSE, console logs, thrown error messages, exported trace, or sessionStorage.

## 10. Generic model adapter

Refactor carefully inside server-only code so the project has one small generic structured-model function that can accept SERVER-SIDE ONLY:

- system prompt;
- prompt/input string;
- JSON schema;
- expected validator;
- parent AbortSignal;
- per-call remaining timeout;
- max output tokens.

The browser must NOT be able to provide model URL, model name, arbitrary system prompt, schema, permissions, or auth token.

Keep the old `runOllamaTriage(message)` API working as before by making it a wrapper around the generic adapter or otherwise preserving its behavior.

For every new agent call keep:

```text
stream: false
think: false
temperature: 0
num_predict <= 600
```

The existing Modal bearer auth remains server-side.

## 11. Prompts

Create separate system prompts for:

- Intake Agent
- Technical Agent
- Business Agent
- Finance Agent
- Reviewer Agent

All prompts must explicitly state that request text and previous-agent fields are UNTRUSTED DATA, not instructions to the model.

Department role boundaries:

### Technical
Handles API integration, errors, support, troubleshooting, technical launch. Recommends actions only. Must not execute commands, change access, or claim an issue was fixed.

### Business
Handles partnerships, sales, marketing, co-marketing, commercial communication, and media requests. Must not send replies, sign agreements, or claim commercial terms are accepted.

### Finance
Handles invoices, duplicate charges, billing/payment questions. Must not issue refunds, move money, or claim a payment action occurred.

Reviewer checks the selected proposal against the sanitized source request and routing constraints. It is allowed to return `revise`, but Phase 1 orchestration must stop such a case as `manual_review` rather than implementing a correction loop.

## 12. Real handoff contract

For every actual transition create:

```ts
type Handoff = {
  handoff_id: string;
  run_id: string;
  source_step_id: string;
  target_step_id: string;
  source_agent_id: string;
  target_agent_id: string;
  reason: string;
  forwarded_context: Record<string, unknown>;
  withheld_field_names: string[];
  created_at: string;
};
```

CRITICAL: `forwarded_context` in `handoff_created` must be the same data object actually serialized into the next model call. Do not show a pretty summary while secretly sending a larger hidden source payload.

System prompts and local handbook/rules are role instructions, not `forwarded_context` from the previous agent.

For Phase 1:

### Intake -> Department projected context
Include only what Department needs, for example:

```ts
{
  request_summary,
  request_type,
  priority,
  confidentiality,
  route_reason,
  evidence,
  missing_information,
  sanitized_request
}
```

Do not include raw pre-sanitized input.

### Department -> Reviewer projected context
Include the sanitized request plus validated Intake and DepartmentProposal needed for review. The exact serialized object must match the handoff event.

## 13. Orchestration rules for Phase 1

Use deterministic TypeScript rules.

### A. Before Intake

- invalid/empty/too long -> return HTTP 400 JSON before starting SSE if request envelope itself is unusable, OR emit early `workflow_failed` once SSE started; choose one consistent implementation;
- sanitize secrets;
- create per-run state;
- emit `workflow_started`;
- emit `input_checked` with only safe metadata (`character_count`, `sensitivity_flag_types`, `confidentiality_floor`).

### B. Intake

Call `intake_agent`.

After validated Intake:

1. If sanitization flags exist, or Intake says `privacy_review_needed=true`, or Intake confidentiality is not `internal`:
   - emit `routing_decision` explaining that Phase 1 cannot auto-forward sensitive content;
   - emit skipped states as appropriate;
   - finish `workflow_completed` with `outcome: manual_review`;
   - do NOT call a Department or fake a privacy review.

2. If department is `unknown` or a clarification question is required because routing is not safe:
   - finish `needs_information` with exactly one concrete clarification question;
   - no Department/Reviewer call.

3. Otherwise select exactly one allowed Department Agent based on validated `department_candidate`.

### C. Department

- build projected context;
- emit real `handoff_created`;
- emit `agent_started`;
- call only the selected Department profile;
- validate that returned `department` exactly matches the selected profile;
- emit `agent_completed`.

### D. Reviewer

- build reviewer context;
- emit real `handoff_created`;
- call `reviewer_agent`;
- emit `review_completed`.

If Reviewer `approved`:
- run deterministic final policy checks;
- emit `policy_checked`;
- return `routed_demo`.

If Reviewer `needs_information`:
- return `needs_information`.

If Reviewer `revise`, `manual_review`, changes sensitivity, or proposes another department:
- return `manual_review`;
- do not start Phase 2 correction/rerouting loops.

## 14. Execution budget

Per run:

- total workflow deadline: 180 seconds;
- single model attempt: no more than 120 seconds and no more than remaining workflow time;
- total LLM attempts: max 6 including schema retries;
- no more calls after client disconnect if not already started;
- pass an AbortSignal down to fetch/model adapter where practical;
- a remote call already started may still complete after disconnect; do not claim otherwise.

Heartbeat suggestion: every ~12-15 seconds while work is active.

No background jobs, no queue, no WebSockets, no DB/checkpoints, no durable resume.

## 15. Frontend scope

Replace the homepage demo experience with a bounded Request Desk UI, but do NOT perform the full Phase 3 site redesign.

The homepage should immediately present:

- headline: `One request. Watch the agents work.`
- short Request Desk subheading;
- request textarea;
- button: `Send a request`;
- 3 simple fictional presets: Technical, Business, Finance;
- warning: `Use fictional requests. Do not enter passwords, API keys, or real personal data.`
- cold-start notice: first run after idle can take around 90 seconds based on an observed prior run; follow-up calls are typically much faster, without promising an exact time;
- minimal live workflow graph;
- final request card;
- clear interrupted/error state.

Do not expose chain-of-thought. Public reasons are concise structured summaries only.

## 16. Minimal graph behavior

Show nodes for:

```text
Intake
Technical
Business
Finance
Reviewer
```

All three Department nodes may be visible, but only the selected one becomes active.

State must be reduced from backend events:

- idle: neutral;
- running: strongest Pegas blue/violet accent;
- completed: calm positive state;
- skipped: muted;
- failed/manual review: clear warning/error state;
- selected edge: strong branded route;
- on real `handoff_created`, trigger a short branded pulse on that edge.

The handoff pulse may use a CSS animation whose class is applied when the real event arrives. Do NOT create a timer sequence that pretends agents advanced before backend events exist.

No React Flow or graph dependency is needed for this simple Phase 1 layout.

## 17. Branding scope included in this session

The canonical owner-provided logo is included in the input package as:

```text
brand/PEGAS_LOGO_CANONICAL.png
```

Copy it into a normal project asset path, preferably:

```text
public/brand/pegas-logo.png
```

Do not redraw it, recolor it, convert it into a different mark, or inline it as base64.

Update:

- `components/AppHeader.tsx`: remove black square `P`, use Pegas logo/wordmark identity;
- `app/layout.tsx`: title `Pegas — Multi-Agent Request Desk` and description `Watch a self-hosted open model route real requests between specialized AI agents.`;
- `app/globals.css`: introduce reusable Pegas accent tokens derived from the logo (blue/cyan/violet) while keeping large surfaces neutral;
- graph active states and main CTA should use the same brand system.

Do NOT make the whole site gradient-heavy. Do not add mascot/wing animations.

Do not attempt a mark-only favicon crop in this task unless it can be done safely from the provided asset without redrawing. Existing icon may remain for this bounded Phase 1 if a clean derivative is not available.

## 18. Suggested file structure

You may adjust names slightly, but keep concerns separate and simple. A reasonable structure is:

```text
app/api/workflows/run/route.ts
lib/workflow/types.ts
lib/workflow/schemas.ts
lib/workflow/prompts.ts
lib/workflow/sanitize.ts
lib/workflow/events.ts
lib/workflow/orchestrator.ts
components/RequestDeskWorkspace.tsx
components/WorkflowGraph.tsx
components/WorkflowResultCard.tsx
```

Modify as needed:

```text
lib/ollama.ts
app/page.tsx
components/AppHeader.tsx
app/layout.tsx
app/globals.css
```

Copy asset:

```text
brand/PEGAS_LOGO_CANONICAL.png
  -> public/brand/pegas-logo.png
```

Do not delete old components just because homepage no longer uses them. Legacy pages may still import them.

## 19. DO NOT CHANGE

- `modal-poc/modal-poc/app.py`
- model (`qwen3:4b`)
- Modal provider/runtime architecture
- current `/api/analyze` external contract
- seven-category legacy triage enums/benchmark dataset
- `/api/proof` in this session
- blog articles/history
- benchmark data/metrics
- dependency versions
- Git author identity
- environment variable names/secrets

Do not add a database, Redis, hosted fallback model, shell executor, durable approvals, background queue, LangChain, or LangGraph.

## 20. Error behavior

Use safe user-facing errors. Never return private endpoint URLs, auth headers, raw model transcripts, stack traces, or secrets.

Distinguish at least:

- invalid input;
- model offline/unreachable;
- model timeout/startup timeout;
- invalid model structured output;
- interrupted SSE/network stream;
- workflow deadline/call-budget exhaustion.

A network interruption before terminal event must render `Interrupted`, not a success card.

## 21. Tests / verification

### Static / deterministic

Add focused tests only if the current project already has a test runner. It does not. Therefore do NOT add Jest/Vitest just for this task.

Instead keep pure helpers easy to inspect and verify with build/lint plus manual/live checks.

Mandatory developer checks:

```text
npm run lint
npm run build
```

### Functional local/mock-free checks where credentials are available

1. Technical example reaches `technical_agent` and then Reviewer.
2. Business or Finance example reaches a different Department profile and then Reviewer.
3. Credential-like input is redacted and ends `manual_review` before Department.
4. Cold run displays the cold notice immediately and receives early SSE event before model completion.
5. Disconnect/error does not produce a fake completed result.
6. Existing `/api/analyze` still builds and retains its response contract.

Do NOT run a large paid benchmark suite for this task.

If live Modal/Vercel credentials are unavailable in the coder environment, clearly say live checks were NOT performed. Do not call mock results live proof.

## 22. Expected output

Return ONE complete ZIP containing the full project tree needed to replace the provided snapshot, not a patch-only ZIP.

Include a short `CODER_HANDOFF.md` at project root with:

- files added;
- files changed;
- exact behavior implemented;
- lint/build result;
- live tests actually performed, if any;
- anything not verified;
- env/deploy impact;
- any known limitation.

Do not include:

- `.env` or secrets;
- `.venv`;
- `node_modules`;
- `.next`;
- ZIP files nested inside the output;
- cache files.

## 23. Known repository observations from architect review

These are context, not extra scope:

- current `.gitignore` already excludes `.env*` except `.env.example`, `.next`, `node_modules`, build output, and `*.zip`;
- current homepage still contains old infrastructure-first copy;
- `ArchitectureCard.tsx` and `lib/site.ts` still contain RunPod labels from earlier stages;
- `/api/proof` calls diagnostic routes that do not match the current protected Modal transport and is a known separate task;
- current snapshot references `/build` in navigation/docs but no `app/build/page.tsx` exists in the provided snapshot; do not invent or rebuild it in Phase 1;
- no agent graph/workflow code currently exists;
- no additional package is necessary for this Phase 1 implementation.

Stay inside this task.
