# MCP Step 1B — report

## Changed files

- `lib/workflow/paid-schemas.ts`: `exactEvidence` no longer fails. It mirrors `evidenceArray` from `schemas.ts` with the paid 240-char limit:
  - a non-array becomes `[]` with `defaulted_evidence` (undefined) or `discarded_invalid_evidence`;
  - it keeps only trimmed, non-empty strings of 240 chars or fewer that are exact substrings of `source`, de-duplicated, at most 3;
  - if anything was dropped, it adds `filtered_evidence`.

  `validatePaidRouting` now returns `normalized_fields: ev.normalized_fields` (it was `[]`), so the new test can see `filtered_evidence`. No other validator, limit or rule was changed. Only exact substrings of the allowed context are still kept.
- `lib/workflow/prompts.ts`: the "Copy numbers … never reformat them." sentence is added to `INTAKE_SYSTEM_PROMPT` and `ROUTING_SYSTEM_PROMPT`.
- `lib/mcp/run.ts`:
  - New helper `failedAgent()` finds the last `agent_failed` event. If there is one, `failure.failed_agent` is added for both tools. The first failure line becomes `Pegas stopped at the <Agent label> (<message>).`. The message comes from the `agent_failed` payload, or else from the `workflow_failed` message.
  - `paymentLines`, when there is no payment summary:
    - "Routing did not select Legal…" appears only if `consultation_skipped` exists;
    - if the workflow failed before `consultation_requested`, it says "The workflow stopped before the payment step. Nothing was signed or spent.";
    - otherwise there is no line.

    All other branches are unchanged.
  - The spending line appears only when there is a `payment_settled` or `payment_confirmed` event, or when a replayed card has `agentic_payment_evidence.settlement.transaction_signature`.
- `scripts/payment-workflow-tests.ts`: removed the stale "Conceptual inspiration only…" assertion (the `KYA-lite` assertion stays). Added two `validatePaidRouting` assertions: one for filtered evidence plus `filtered_evidence`, and one where a non-array becomes `[]`.

## Deviations

1. **PAID_ROUTING_SYSTEM_PROMPT has no explicit copy of the sentence.** It is built from `ROUTING_SYSTEM_PROMPT` (`ROUTING_SYSTEM_PROMPT.replace(...)`), so it already gets the sentence. Appending it again would have repeated it in the paid prompt.
2. **`validatePaidReview` uses the same `exactEvidence`.** Reviewer evidence is now filtered too, not hard-failed. Its `normalized_fields` were left as they were (only `reason`'s are returned), because the task said not to touch other validators.
3. **`paymentLines` has a third case with no line.** When there is no payment summary, no `consultation_skipped` and no failure before the request, it now returns no line. Before, it always printed "Routing did not select Legal". This case should not happen in practice.

## Checks

| Command | Result |
|---|---|
| `npm run test:payments:all` | pass (policy, protocol, workflow) |
| `npm run test:phase2` | pass |
| `npm run test:phase3` | pass |
| `npm run test:phase4:routing` | pass |
| `npm run build` | pass |
| `npm run lint` | 1 error, the expected old one only: `components/ModelRuntimeControl.tsx:41` `react-hooks/set-state-in-effect` |

The MCP paid tool, the paid web flow and `payments:live-smoke` were not called. No commit, push or deploy.
