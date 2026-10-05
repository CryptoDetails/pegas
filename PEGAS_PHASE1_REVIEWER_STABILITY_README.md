# Pegas Phase 1 Reviewer Stability Patch

This patch addresses an intermittent Phase 1 failure where Intake and the selected Department agent complete successfully, but the Reviewer fails structured-output validation on a repeated run.

Changes:
- Reviewer prompt now uses a lower-entropy approved shape: empty `issues`, `correction_target`, `correction_request`, and `evidence` where appropriate.
- Reviewer reason is explicitly constrained to one short sentence.
- Reviewer evidence is intentionally `[]` in Phase 1 to remove unnecessary exact-substring generation pressure.
- Validators accept the canonical nullable fields as either `null` or empty string and normalize them to `null`.
- Evidence safety is preserved by keeping only exact substrings of `sanitized_request`; paraphrased evidence is discarded instead of crashing an otherwise valid workflow.
- Empty strings inside issue/open-question arrays are ignored rather than failing the whole workflow.

No Modal backend changes. No deployment command changes. No change to the legacy `/api/analyze` route.
