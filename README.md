# Phase 3 Workflow Graph layout fix

Replace `components/WorkflowGraph.tsx` with the included file.

Fixes:
- removes the hard desktop `min-w-[860px]` constraint that caused the routing graph to overflow its card;
- keeps the full Intake -> Privacy -> Department -> Reviewer path visible on desktop;
- uses flexible zero-minimum grid tracks so the graph shrinks with its container;
- keeps horizontal scrolling only as a fallback on very narrow screens;
- does not modify RequestDesk textarea/layout, workflow logic, events, or agent routing.
