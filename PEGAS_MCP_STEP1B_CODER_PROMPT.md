# PEGAS — CODER TASK: STEP 1B (paid routing evidence + MCP result text)

Implement exactly this task. The architect has already diagnosed it. No refactors, no new dependencies, no other files.

---

## 0. Diagnosis (for context, do not re-investigate)

A live run of the production paid flow on the website (`scenario: "paid_legal"`) failed at Routing with:

```
routing_agent: evidence must be an exact substring of allowed context
```

The same failure happened three times through MCP, with nothing spent.

After Privacy, paid Routing only sees `safe_brief`. The model quotes phrases from the original request, those phrases are not in `safe_brief`, and `exactEvidence` in `lib/workflow/paid-schemas.ts` hard-fails. The repair attempt fails the same way and the workflow dies.

The standard flow already solved this in `lib/workflow/schemas.ts` with `evidenceArray(...)`, which **filters** invalid evidence instead of failing.

---

## 1. `lib/workflow/paid-schemas.ts`: filter, do not fail

Replace the behaviour of `exactEvidence(v, source)` so that it never returns `ok: false`:

- not an array → `[]`, with `normalized_fields: ["discarded_invalid_evidence"]` (or `["defaulted_evidence"]` when `undefined`);
- for each item, keep it only if it is a string, is non-empty after trim, is ≤ 240 chars, and `source.includes(trimmed)` is true;
- de-duplicate and keep at most 3;
- if anything was dropped → `normalized_fields: ["filtered_evidence"]`.

Mirror `evidenceArray` in `schemas.ts`, but keep the paid 240-char limit. Do not import from or change `schemas.ts`.

The security property stays the same: only exact substrings of the allowed context reach `buildLegalModelContext` and the Reviewer.

Do not touch any other validator, length limit or rule in this file.

---

## 2. Prompts: copy numbers exactly

In `lib/workflow/prompts.ts`, append this one sentence to the instructions of `INTAKE_SYSTEM_PROMPT`, `ROUTING_SYSTEM_PROMPT` and `PAID_ROUTING_SYSTEM_PROMPT`:

```
Copy numbers, HTTP status codes, error codes, amounts, dates, paths and endpoint names exactly as written in the request; never reformat them.
```

Reason: qwen3:4b turned "500 errors" into "50:00 errors" in a summary.

Change nothing else in the prompts.

---

## 3. `lib/mcp/run.ts`: honest result text

Claude's UI shows only the text block when `isError` is true, so the text must carry the key facts.

1. **Failed agent.** Find the last `agent_failed` event. If one exists, add `failed_agent: <agent_id>` to the structured `failure` object (both tools). In the text, replace the generic first failure line with:
   `Pegas stopped at the <Agent label> (<failure message>).`
   Reuse the existing `AGENT_LABELS`.

2. **Payment lines (paid tool), `paymentLines`:**
   - "Routing did not select Legal; no payment capability was invoked." only if a `consultation_skipped` event exists;
   - if the workflow failed before any `consultation_requested` event → "The workflow stopped before the payment step. Nothing was signed or spent.";
   - keep all other existing branches unchanged.

3. **Spending line.** Show "Spent under Pegas' own bounded mandate (test USDC only); the caller held no payment authority." only when a `payment_settled` or `payment_confirmed` event exists, or when a replayed card has a settlement `transaction_signature`. Otherwise show nothing about spending.

---

## 4. Stale test

`scripts/payment-workflow-tests.ts` (around line 19) asserts that `app/build/page.tsx` contains "Conceptual inspiration only. Pegas is not affiliated with or endorsed by Lead." The owner intentionally removed that copy. Delete only that assertion.

Add two assertions to the same script (import `validatePaidRouting` the same way the script imports other modules):

- a valid paid routing object whose `evidence` contains one exact substring of `source` and one non-substring → `ok: true`, evidence keeps only the substring, `normalized_fields` includes `"filtered_evidence"`;
- a valid object with `evidence: "not an array"` → `ok: true`, evidence `[]`.

---

## 5. Do NOT touch

Payment code (`lib/payments/*`), x402, AUTH policy, the mandate, store Lua, routes, UI components, `ModelRuntimeControl.tsx` (its lint error stays for now), Modal.

---

## 6. Checks

```
npm run test:payments:all     (must now pass fully)
npm run test:phase2
npm run test:phase3
npm run test:phase4:routing
npm run build
```

`npm run lint` is expected to show only the old `ModelRuntimeControl.tsx` error. Report anything else.

Do NOT call the MCP paid tool, the paid web flow, or `payments:live-smoke`.

---

## 7. Report

Save the report to `mcp-step1b-report.md` in the project root (changed files, check results, any deviation). Then run:

```
git diff > mcp-step1b.diff
```

No commit, no push, no deploy.
