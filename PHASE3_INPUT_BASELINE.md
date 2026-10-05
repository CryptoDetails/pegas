# PHASE 3 INPUT BASELINE

This package is based on the complete Phase 2 coder output supplied by the owner on 2026-10-05.

Two owner-approved changes are intentionally pre-applied in this input and MUST NOT be reverted:

1. `modal-poc/modal-poc/app.py`
   - `scaledown_window=150`
   - This was approved by the owner but had not yet been separately deployed when this Phase 3 package was assembled.

2. `scripts/phase2-correction-tests.ts`
   - TypeScript import paths no longer end in `.ts`, fixing the Vercel/TypeScript TS5097 build failure.

Phase 3 must be implemented on top of this baseline.

Do not revert either change.
Do not otherwise modify Modal runtime/provider/model configuration as part of Phase 3.
