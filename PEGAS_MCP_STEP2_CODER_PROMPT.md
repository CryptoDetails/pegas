# PEGAS — CODER TASK: MCP STEP 2 — "AI agent via MCP" mode on the Demo page

Implement exactly this task. Architecture decisions are final. No new dependencies. No changes outside the listed files.

---

## 1. Goal

A visitor of the Demo page can switch from "Web form" to "AI agent via MCP".

In agent mode the request is **not** sent to `/api/workflows/run`. A small MCP client inside the browser acts as an external AI agent. It talks to our real public endpoint `/api/mcp` with real JSON-RPC:

```
initialize → tools/list → tools/call (with progress) → [paid only] tools/call get_payment_evidence
```

The visitor sees two things at once:

- **left column**, under the form: a live transcript of the agent ↔ Pegas MCP conversation;
- **right column**: the existing graph, agentic finance timeline, result card and payment inspector, animated live from MCP progress notifications.

Message of the screen: an external agent gets a **tool**, not payment **authority**.

---

## 2. Files

### New

```
lib/mcp/browser-client.ts     (tiny JSON-RPC-over-HTTP MCP client for the browser)
components/McpAgentPanel.tsx  (transcript panel)
```

### Modify

```
components/RequestDeskWorkspace.tsx   (mode toggle, agent-mode submit, wiring)
lib/mcp/run.ts                        (progress _meta, final_card)
lib/mcp/server.ts                     (progress cap / pass-through only)
```

### Do NOT touch

`/api/workflows/run`, orchestrators, payments, x402, prompts, validators, `ModelRuntimeControl.tsx`, `WorkflowGraph.tsx`, `AgenticFinanceTimeline.tsx`, `AgenticPaymentInspector.tsx`, `WorkflowResultCard.tsx`, other pages, Modal.

The existing components must work unchanged, fed by synthetic events (see 4).

---

## 3. Server changes (`lib/mcp/run.ts`, `lib/mcp/server.ts`)

### 3.1 Progress for every visible step, with machine-readable `_meta`

- Send a progress notification for every workflow event **except** `heartbeat`, `handoff_created`, `input_checked`, `workflow_completed` and `workflow_failed`.
- Keep the human `message` label. Add labels where missing (`review_completed` → "Reviewer completed", `consultation_requested` → "Legal consultation requested", `counterparty_verified` → "Counterparty verified (KYA-lite)", `consultation_completed` → "Legal advisory delivered", `consultation_skipped` → "No paid consultation needed", `routing_decision` → "Routing decided"). Fall back to the type with spaces.
- Add to each progress notification's params:
  ```
  _meta: { "pegas/step": { seq, type, step_id, agent_id } }
  ```
  Only these four fields. Never payloads. They are already public in `steps`.
- Raise the cap from 40 to 80 per call.

### 3.2 `final_card` in `structuredContent`

For `submit_request` and `request_legal_consultation` add `final_card`: the `FinalRequestCard` from `workflow_completed` (or the stored card when replayed), else `null`.

This is the same public card the website already shows any visitor. Keep everything else in the result unchanged.

---

## 4. Browser MCP client (`lib/mcp/browser-client.ts`)

Hand-written, no SDK. Requirements:

- POST to `/api/mcp` (same origin) with headers `Content-Type: application/json` and `Accept: application/json, text/event-stream`.
- `initialize` with `clientInfo: { name: "pegas-demo-agent", version: "1.0.0" }` and the same `protocolVersion` that worked in your step-1 local checks. Then send `notifications/initialized`.
- If the server returns an `mcp-session-id` header, send it on later requests (it is stateless, so normally there is none).
- Parse both response types:
  - `application/json` → a single JSON-RPC message;
  - `text/event-stream` → read the stream; each `data:` line is a JSON-RPC message. Messages with `method: "notifications/progress"` go to an `onProgress` callback; the message whose `id` matches the request is the result.
- `callTool(name, args, { onProgress })` sends `params._meta.progressToken` (any unique string) so the server streams progress.
- Expose an `onTraffic(entry)` hook. Every request, response and notification is reported as `{ direction: "out" | "in", method, summary, raw }` for the transcript. `raw` is truncated to 3,000 chars.
- Abort support via `AbortSignal`.
- Errors: JSON-RPC `error`, HTTP non-2xx and tool results with `isError: true` are surfaced as values, not thrown into the void.

---

## 5. UI (`RequestDeskWorkspace.tsx` + `McpAgentPanel.tsx`)

### 5.1 Toggle

Above the existing "Standard request / Paid Legal" switch, add a second, same-style 2-button switch:

```
Web form   |   AI agent via MCP
```

Default is "Web form", which behaves exactly as today. Switching is blocked while busy. Switching resets the run state like `switchMode` does.

In agent mode, show one short note under the toggle:

> A built-in MCP client in your browser plays an external AI agent. It discovers Pegas tools and calls them over the Model Context Protocol, the way Claude or Cursor would. It gets a tool, not payment authority.

Followed by a small line with a copy button:

> Use it from your own agent: `https://pegas-rouge.vercel.app/api/mcp`

Build the URL from `window.location.origin + "/api/mcp"`.

The button text in agent mode is "Send via MCP agent" (running: "Agent is calling Pegas…").

### 5.2 Agent-mode submit

1. Reset state as `submit()` does.
2. `initialize`, `tools/list`.
3. Call `submit_request` (standard) or `request_legal_consultation` (paid), with `{ message, agent_name: "Pegas demo agent (browser)" }`. For paid, add `request_id: crypto.randomUUID()`.
4. On every progress notification that has `_meta["pegas/step"]`, build a synthetic `WorkflowEvent`:
   ```
   { event_version: 1, run_id: "mcp", event_id: `mcp-${seq}`, seq, type, timestamp: now, step_id, agent_id, payload: null }
   ```
   and pass it to the existing `applyEvent`. The graph, timeline and runtime control update live, with no changes to those components.
   - Exception: `applyEvent` ignores `workflow_completed` / `workflow_failed` payload-less events. Do not synthesize those.
5. On the tool result:
   - success with `final_card` → `setCard(final_card)`; set `selected` from `final_card.paid_department ?? final_card.department`; set `manual` like today; status idle;
   - `isError` → show the existing error box with `structuredContent.failure.message` (or the text block) and, if present, "Stopped at: <failed_agent>". Status failed.
6. Paid only, if the result has `operation_id`: call `get_payment_evidence({ operation_id })`. Show it in the transcript (see 5.3). Do not change the card from it.
7. If the stream ends without a result → status "interrupted", same message as today.

`AgenticPaymentInspector` gets `events` (payload-less) plus `card`. It must still render from `card.agentic_payment_evidence`. If it crashes or shows nothing with null payloads, report it. Do not modify it.

### 5.3 `McpAgentPanel` (left column, below the form card, agent mode only)

Title: **"Agent ↔ Pegas · MCP transcript"**. Subtitle: "Real JSON-RPC to /api/mcp".

Entries, newest at the bottom, auto-scroll:

- arrow and side: `Agent → Pegas` or `Pegas → Agent`;
- method (`initialize`, `tools/list`, `tools/call · request_legal_consultation`, `progress`, `result`);
- one-line human summary, for example:
  - `initialize` result → "Connected to pegas 0.3.0"
  - `tools/list` result → "3 tools: submit_request, request_legal_consultation, get_payment_evidence"
  - progress → its message
  - paid result → "Outcome routed_demo · AUTH 10/10 · tx finalized"
  - evidence result → "Principal on the mandate: mcp-external-agent (not verified) · mandate consumed"
- click an entry to expand and see `raw` JSON (monospace, scrollable, max height ~240px).

Group consecutive progress lines visually (lighter style). Do not collapse them.

After a paid result, show a small fixed block at the bottom of the panel, built from `structuredContent.delegation_chain` and `authority_note`:

```
External agent via MCP (self-declared, not verified)
  → Pegas Routing Agent (registered, KYA-lite)
    → Legal Advisor (registered seller)
Each link can only narrow authority. The agent holds no keys and cannot change price, seller, network, asset or count.
```

Style: reuse the existing look (rounded-3xl cards, slate/indigo palette, `card-shadow`). Keep it calm and readable, with no new colors or fonts. The panel must be usable at phone width.

### 5.4 Paid preset

Replace `paidPreset` with this text. It routes reliably to Legal in live tests:

```
We need a legal review of a contract clause before signing. Our vendor NDA allows the vendor to use our shared information to train its AI models and to keep that information for 5 years after the agreement ends. Is this clause legally acceptable, and what should we ask to change?
```

---

## 6. Checks

```
npm run lint      (only the old ModelRuntimeControl.tsx error is allowed)
npm run build
npm run test:payments:all
```

Local live check with `npm run dev`. The standard flow is free; it uses the real Modal model from `.env.local`.

1. Open `http://localhost:3000`, choose "AI agent via MCP" + "Standard request", use the Technical preset, and send.
2. Confirm:
   - the transcript shows initialize, tools/list, tools/call, several progress lines and the result;
   - the graph nodes animate during the run, not only at the end;
   - the result card appears.
3. If progress does not arrive while the run is in progress (everything only at the end), report it. Do not work around it.

Do NOT run the paid flow locally, the paid MCP tool, or `payments:live-smoke`. The architect verifies paid in production.

---

## 7. Report

Save `mcp-step2-report.md` in the project root: changed files, check results, whether live progress worked, and any deviation. Then run:

```
git add -N lib/mcp/browser-client.ts components/McpAgentPanel.tsx
git diff > mcp-step2.diff
```

No commit, no push, no deploy.
