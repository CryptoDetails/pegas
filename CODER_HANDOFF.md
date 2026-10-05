# PEGAS REQUEST DESK — PHASE 4 CODER HANDOFF
Date: 2026-10-05

## Result
Phase 4 source changes are implemented against the supplied Phase 4 snapshot.

Final runtime AI roles:
- `intake_agent`
- `privacy_agent`
- `routing_agent`
- `reviewer_agent`

`technical`, `business`, and `finance` are static department destinations/profiles in `lib/workflow/departments.ts`. They are not runtime AgentIds and do not create separate model calls.

## RoutingDecision contract
```ts
type RoutingDecision = {
  department: Department;
  summary: string;
  priority: Priority;
  confidentiality: Confidentiality;
  routing_reason: string;
  department_brief: string;
  next_action: string;
  open_questions: string[];
  evidence: string[];
};
```

## Routing contexts
Normal Routing context:
```ts
{
  sanitized_request,
  intake,
  department_profiles
}
```

Privacy Routing context:
```ts
{
  safe_brief,
  request_type,
  routing_hint,
  priority,
  confidentiality,
  route_reason,
  privacy_reason,
  recipient_restrictions,
  evidence,
  department_profiles
}
```

The Privacy context contains no `sanitized_request`. The exact object passed to Routing is also emitted as the handoff `forwarded_context`.

## Reviewer correction
Reviewer #1 may return `revise` once. The reviewer suggestion (`correction_target`) is advisory. The backend emits Reviewer -> Routing with the previous RoutingDecision, reviewer issues, correction request, optional suggested department, and correction_cycle=1. Routing #2 makes the actual final department decision. Routing #2 -> Reviewer #2 then runs, and Reviewer #2 is terminal. A further revision request ends as manual review.

On a Privacy path, the correction context is built from the already reduced Routing base. It never restores `sanitized_request`, so Reviewer -> Routing and Routing -> Reviewer #2 remain inside the Privacy boundary.

## Evaluation
Dataset: `data/workflow-evaluation-v1.json`
Version: v1
Cases: 12 fictional cases

Current workflow evaluation route: `/evaluation`
It calls `POST /api/workflows/run`, parses the same SSE event stream, runs cases sequentially, never auto-runs, ignores duplicate event IDs, and marks streams without a terminal event incomplete.

Metrics:
- route accuracy
- outcome accuracy
- privacy activation accuracy
- context-boundary compliance
- completion rate
- median workflow duration
- p95 workflow duration
- average/max logical agent calls from real `agent_started` events
- correction usage from real correction/revision events

Legacy `/benchmark` remains separate and has only a small link to the current workflow evaluation.

## Runtime / call budget
No route duration or model-call budget change.
- workflow deadline remains 180000 ms
- per-attempt timeout remains 120000 ms
- total model attempt ceiling remains 12
- correction cycle remains max 1

Modal runtime was not changed. `modal-poc/modal-poc/app.py` still contains `scaledown_window=150`. The stale README lifecycle sentence was corrected to 150 seconds.

## Files changed/new
- `app/build/page.tsx`
- `app/evaluation/page.tsx` (new)
- `components/BenchmarkDashboard.tsx`
- `components/RequestDeskWorkspace.tsx`
- `components/WorkflowEvaluationDashboard.tsx` (new)
- `components/WorkflowGraph.tsx`
- `components/WorkflowResultCard.tsx`
- `data/workflow-evaluation-v1.json` (new)
- `lib/workflow/correction.ts`
- `lib/workflow/departments.ts` (new)
- `lib/workflow/evaluation.ts` (new)
- `lib/workflow/orchestrator.ts`
- `lib/workflow/privacy.ts`
- `lib/workflow/prompts.ts`
- `lib/workflow/schemas.ts`
- `lib/workflow/types.ts`
- `modal-poc/modal-poc/README.md`
- `package.json`
- `scripts/phase2-correction-tests.ts`
- `scripts/phase3-privacy-tests.ts`
- `scripts/phase4-routing-tests.ts` (new)
- `scripts/phase4-evaluation-tests.ts` (new)
- `tsconfig.json`
- `CODER_HANDOFF.md`

## Quality gate performed in this environment
Passed:
- `npm run test:phase2`
- `npm run test:phase3`
- `npm run test:phase4:routing`
- `npm run test:phase4:evaluation`

Not completed in this sandbox:
- `npm run lint`
- `npm run build`

Reason: the supplied archive intentionally excludes `node_modules`, and dependency installation could not complete in the sandbox because an npm package tarball was unavailable from cache / registry access timed out. Therefore ESLint and Next.js binaries were not available locally. This is reported as **not run**, not as a pass.

Live smoke tests not performed. No live Modal credentials/runtime were used.

## Known limitations
- A real dependency-installed environment must run `npm ci`, `npm run lint`, and `npm run build` before deployment.
- The full 12-case live evaluation was intentionally not executed from the coder environment.
