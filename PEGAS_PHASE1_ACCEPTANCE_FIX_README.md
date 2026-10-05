# Pegas Phase 1 acceptance fix

This patch fixes the two failing acceptance branches:

1. Credential-like input is now stopped deterministically before any LLM call and completed as `manual_review`.
2. Clearly vague requests with no department-specific signal are forced to `needs_information` instead of being guessed into Technical/Business/Finance.

Only `lib/workflow/orchestrator.ts` changes runtime behavior.
