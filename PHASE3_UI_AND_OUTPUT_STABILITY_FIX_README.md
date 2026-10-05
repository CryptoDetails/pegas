# Pegas Phase 3 UI + Structured Output Stability Fix

This patch combines two pending fixes:

1. Request panel / textarea layout stability when Handoff Inspector contains long context.
2. Structured output length hardening for Qwen descriptive text fields.

## Structured output change

Length limits on descriptive text remain bounded, but overlong model text is normalized by truncating it to the existing backend limit instead of failing the whole workflow.

Semantic control fields remain strict:
- department enums
- priority enums
- confidentiality enums
- privacy/review decisions
- booleans

The Intake prompt also explicitly asks for shorter summary, request_type, and route_reason values.

## Files

- components/RequestDeskWorkspace.tsx
- components/HandoffInspector.tsx
- lib/workflow/schemas.ts
- lib/workflow/prompts.ts

Extract over C:\Pegas with replacement, then run `npm run build`.
