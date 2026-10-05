# Pegas Phase 3 build fix

Fixes the three TypeScript build errors observed after Phase 3 deployment prep:

1. `components/RequestDeskWorkspace.tsx`
   - narrows `event.payload` into a local `handoff` variable before appending it to `Handoff[]`.

2. `scripts/phase2-correction-tests.ts`
   - removes `.ts` suffixes from local import paths.

3. `scripts/phase3-privacy-tests.ts`
   - removes `.ts` suffixes from local import paths.

Replace these files over `C:\Pegas` preserving paths.

Then run:

```text
npm run build
```

This environment could not execute the Next.js build because dependencies/node_modules are not present in the extracted coder archive, so final build verification must be done in the owner's existing `C:\Pegas` checkout.
