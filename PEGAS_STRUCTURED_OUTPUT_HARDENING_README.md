# Pegas Request Desk - Structured Output Hardening

Purpose: fix intermittent Phase 1 failures where a semantically valid Qwen response is rejected because of harmless JSON-shape variation.

## Changed files

- `lib/workflow/schemas.ts`
- `lib/workflow/orchestrator.ts`
- `components/RequestDeskWorkspace.tsx`

## What changed

### Backend owns the canonical contract

The model-facing JSON schemas now require only fields that actually control routing/policy. Optional support fields can be omitted by Qwen and are normalized server-side.

Safe normalizations now include:

- extra model keys are ignored;
- one common wrapper object (`result`, `output`, `response`, `data`) can be unwrapped;
- enum casing/outer whitespace is normalized (`Technical` -> `technical`);
- exact string booleans (`"true"` / `"false"`) are normalized to booleans;
- missing/null `evidence` -> `[]`;
- paraphrased/invalid evidence is discarded instead of failing the run;
- missing/null `missing_information`, `open_questions`, `issues` -> `[]`;
- a single string for those list fields is normalized to a one-item array;
- missing/null/empty nullable text -> `null`;
- missing reviewer correction fields are normalized safely.

Control semantics remain strict. Unsupported department/priority/confidentiality/reviewer-decision values still fail rather than being guessed.

### Field-specific repair

If validation really fails, the one allowed repair attempt is told the exact validation problem rather than receiving only a generic repair message.

### Useful public diagnostic

If the repaired response still fails, the error card now shows a safe field-level diagnostic such as:

`intake_agent: department_candidate has unsupported value "legal"`

Raw model output and chain-of-thought are not exposed.

## Verification already performed

Targeted TypeScript compilation passed for the workflow backend files (`schemas`, `orchestrator`, and their dependencies).

Local validator checks confirmed that harmless shape variations normalize successfully while unsupported routing values still fail.

A full Next build could not be completed in the isolated patch environment because its extracted `node_modules` snapshot was incomplete. Run the normal project build in `C:\Pegas` before commit.

## Deploy

After extracting this ZIP over the project root, in the VS Code terminal:

```bash
npm run build
```

If build passes:

```bash
git add .
git commit -m "Harden Request Desk structured output"
git push
```

Vercel deploys the pushed commit automatically.

## Acceptance test

Run each normal preset at least 3 times:

1. Technical
2. Business
3. Finance

Then run the credential/manual-review test.

A normal request must not fail because a non-control field was omitted, null, wrapped, differently cased, or included unusable evidence.
