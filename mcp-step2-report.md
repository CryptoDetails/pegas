# MCP Step 2 — "AI agent via MCP" mode: report

## Changed files

New:
- `lib/mcp/browser-client.ts` — hand-written MCP client (JSON-RPC over Streamable HTTP, no SDK). `initialize` (protocolVersion `2025-06-18`, clientInfo `pegas-demo-agent 1.0.0`) → `notifications/initialized` → `tools/list` → `tools/call` with `_meta.progressToken`. Parses `application/json` and `text/event-stream`, forwards `mcp-session-id` if the server sets one, reports every request/response/notification through `onTraffic` (`raw` truncated to 3,000 chars), supports `AbortSignal`. JSON-RPC errors, HTTP non-2xx, transport errors and "stream ended without result" come back as `{ ok: false, kind, message }` values; `isError` tool results come back as normal results.
- `components/McpAgentPanel.tsx` — "Agent ↔ Pegas · MCP transcript" panel: direction, method, one-line summary, click to expand raw JSON (max-h 240px), auto-scroll, lighter grouped progress lines, delegation-chain block built from `delegation_chain` + `authority_note`.

Modified:
- `lib/mcp/run.ts` — progress for every event except `heartbeat`, `handoff_created`, `input_checked`, `workflow_completed`, `workflow_failed`; new labels (Reviewer completed, Legal consultation requested, Counterparty verified (KYA-lite), Legal advisory delivered, No paid consultation needed, Routing decided; plus `<Agent> failed`), fallback = type with spaces. `ProgressFn` now also gets `{ seq, type, step_id, agent_id }`. `final_card` added to `structuredContent` of `submit_request` and `request_legal_consultation` (stored card on replay, else `null`).
- `lib/mcp/server.ts` — cap 40 → 80; passes `_meta: { "pegas/step": { seq, type, step_id, agent_id } }` in each progress notification.
- `components/RequestDeskWorkspace.tsx` — "Web form | AI agent via MCP" toggle above the scenario switch (blocked while busy, resets like `switchMode`), agent-mode note + endpoint line with Copy, button texts, `submitViaMcp` (synthetic payload-less events → existing `applyEvent`; card/selected/manual from `final_card`; error box with `failure.message` + "Stopped at: <failed_agent>"; paid → `get_payment_evidence` shown only in the transcript; no result → "interrupted"), new `paidPreset`. Reset logic of `submit()` extracted into `resetRun()` (shared by both modes; web-form behaviour unchanged).

## Checks

- `npm run lint` — 1 error, the known `react-hooks/set-state-in-effect` in `ModelRuntimeControl.tsx`. Nothing new.
- `npx tsc --noEmit` — clean.
- `npm run build` — passes.
- `npm run test:payments:all` — policy, protocol, workflow: all passed.

## Live check

Done against the dev server that was already running on `http://localhost:3123` (PID 11588; a second `next dev` in the same folder is refused by Next, and I did not stop the existing one).

Using `BrowserMcpClient` itself from Node (fetch pointed at localhost:3123), standard flow, Technical preset:

```
0.0s Agent → Pegas  initialize
0.5s Pegas → Agent  result  {"name":"pegas","title":"Pegas","version":"0.3.0"}
0.5s Agent → Pegas  notifications/initialized
0.5s Agent → Pegas  tools/list
0.6s Pegas → Agent  result  submit_request, request_legal_consultation, get_payment_evidence
0.6s Agent → Pegas  tools/call · submit_request
0.6s Pegas → Agent  progress  workflow started
0.6s Pegas → Agent  progress  Intake agent started
0.6s Pegas → Agent  progress  Intake agent failed
0.6s Pegas → Agent  result    isError, failure { code: model_error, failed_agent: intake_agent }
```

`_meta` arrives as specified, e.g. `{"pegas/step":{"seq":3,"type":"agent_started","step_id":"intake","agent_id":"intake_agent"}}`. `final_card` is `null` on failure.

**Blocker:** that running dev server has no model runtime configured: `POST /api/model/warmup` → `{"status":"error","message":"Model runtime is not configured."}`, and the normal web path `/api/workflows/run` fails the same way (`model_error` at Intake). So I could **not** confirm with a real model run that:
- progress arrives *during* the run rather than at the end (the run ends in under a second, so timing proves nothing);
- the graph animates live and the result card appears.

Handshake, tools/list, tools/call, SSE parsing, `_meta` and the error path all work. To finish the check: restart `npm run dev` so it loads `.env.local` with the model settings, then run the standard flow in the browser.

The demo page (`/`) returns 200 and renders the "Web form / AI agent via MCP" toggle. I had no browser automation, so the UI was not clicked through visually.

## AgenticPaymentInspector with payload-less events

Read through, not changed. With `payload: null` every `eventPayload()` returns `null`, so nothing crashes. During a paid run, once a synthetic `payment_confirmed` arrives (and before `card` exists) it shows the "On-chain confirmation event received" box with "—" values. After the result, it renders fully from `card.agentic_payment_evidence`. Not verified live (paid flow not run, per instructions).

## Deviations

1. **Synthetic `event_id` is `mcp-<run>-<seq>`, not `mcp-<seq>`.** `ModelRuntimeControl` keeps processed event ids in a ref across runs. With `mcp-<seq>`, a second agent run would reuse ids `mcp-1…` and the runtime control would ignore it. `run_id` stays `"mcp"` as specified.
2. `agent_failed` gets the label "`<Agent> failed`" (the old code sent nothing for it; it is not on the exclusion list).
3. `McpTraffic` entries carry an extra `kind` field (`request | response | notification | error`), used only for styling in the transcript.
4. The client also sends the `MCP-Protocol-Version: 2025-06-18` header on every request (Streamable HTTP expects it after initialize).
5. `browser-client.ts` uses an explicit field instead of a TS constructor parameter property, so it also runs under `node --experimental-strip-types` (used for the live check).
6. A side effect of synthetic events: a `revision_requested` with no payload shows the generic notice "Reviewer requested one Routing revision", and `routing_decision` no longer highlights the department live. The department is set from `final_card` at the end.
