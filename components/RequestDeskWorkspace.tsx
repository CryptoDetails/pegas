"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { AgenticFinanceHero } from "./AgenticFinanceHero";
import { AgenticFinanceTimeline } from "./AgenticFinanceTimeline";
import { AgenticPaymentInspector } from "./AgenticPaymentInspector";
import { AppHeader } from "./AppHeader";
import { HandoffInspector } from "./HandoffInspector";
import { McpAgentPanel, type Delegation, type TranscriptEntry } from "./McpAgentPanel";
import { ModelRuntimeControl } from "./ModelRuntimeControl";
import { WorkflowGraph, type GraphStates, type HandoffPulse, type NodeState } from "./WorkflowGraph";
import { WorkflowResultCard } from "./WorkflowResultCard";
import { BrowserMcpClient, type JsonRpcMessage, type McpToolCallResult } from "@/lib/mcp/browser-client";
import type { FinalRequestCard, Handoff, PaidDepartment, WorkflowEvent, WorkflowScenario } from "@/lib/workflow/types";

const presets = {
  Technical: "Our fictional partner API returns 401 after we rotated test credentials. Please help identify the technical next step for the integration team.",
  Business: "A fictional wallet partner has reached out about a potential co-marketing campaign around its upcoming product launch. Please identify the right team and recommend the next step.",
  Finance: "A fictional partner says invoice INV-DEMO-104 appears to include the same service charge twice. Please review the billing request and suggest the next step.",
  Privacy: "This fictional request includes confidential partner pricing for an unreleased agreement. Please route it to the appropriate team without forwarding unnecessary details.",
};
const paidPreset = "We need a legal review of a contract clause before signing. Our vendor NDA allows the vendor to use our shared information to train its AI models and to keep that information for 5 years after the agreement ends. Is this clause legally acceptable, and what should we ask to change?";
const MCP_AGENT_NAME = "Pegas demo agent (browser)";
type Channel = "web" | "mcp";
type StepMeta = { seq: number; type: WorkflowEvent["type"]; step_id: string; agent_id: string | null };
const initialStates: GraphStates = { intake: "idle", privacy: "idle", routing: "idle", legal: "idle", reviewer: "idle" };

function isPaidDepartment(v: unknown): v is PaidDepartment {
  return v === "technical" || v === "business" || v === "finance" || v === "legal";
}

function isHandoff(v: unknown): v is Handoff {
  if (!v || typeof v !== "object") return false;
  const i = v as Partial<Handoff>;
  return typeof i.handoff_id === "string"
    && typeof i.source_agent_id === "string"
    && typeof i.target_agent_id === "string"
    && typeof i.reason === "string"
    && Boolean(i.forwarded_context && typeof i.forwarded_context === "object")
    && Array.isArray(i.withheld_field_names);
}

export function RequestDeskWorkspace() {
  const [channel, setChannel] = useState<Channel>("web");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [failedAgentNote, setFailedAgentNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scenario, setScenario] = useState<WorkflowScenario>("standard");
  const [message, setMessage] = useState(presets.Technical);
  const [states, setStates] = useState<GraphStates>(initialStates);
  const [selected, setSelected] = useState<PaidDepartment | null>(null);
  const [card, setCard] = useState<FinalRequestCard | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "failed" | "interrupted">("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [backendResponded, setBackendResponded] = useState(false);
  const [validationDetail, setValidationDetail] = useState<string | null>(null);
  const [pulse, setPulse] = useState<HandoffPulse>(null);
  const [, setPulseCounter] = useState(0);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [manual, setManual] = useState(false);
  const [revisionNotice, setRevisionNotice] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const seenIds = useRef(new Set<string>());
  const demoFormRef = useRef<HTMLDivElement>(null);
  const transcriptIdRef = useRef(0);
  const mcpRunRef = useRef(0);
  const busy = status === "running";
  const agentMode = channel === "mcp";
  const paidMode = scenario === "paid_legal";
  const paymentGuardrailStopped = errorCode === "payment_declined" && (validationDetail === "rate_limit" || validationDetail === "session_budget" || validationDetail === "daily_budget");
  const legalDeliveryIncomplete = errorCode === "legal_delivery_failed";

  const compactEvents = useMemo(() => events.filter((e) => e.type !== "heartbeat").slice(-24), [events]);
  const runtimeEvents = useMemo(
    () => events.filter((event) => event.type === "agent_started" || event.type === "agent_completed" || event.type === "review_completed" || event.type === "agent_failed"),
    [events],
  );
  const liveLabel = useMemo(() => {
    if (!busy) return null;
    if (states.reviewer === "running") return "Reviewer is checking the proposal…";
    if (states.legal === "running") return "Legal Advisor is running after confirmed payment evidence…";
    if (events.some((e) => e.type === "payment_settling") && !events.some((e) => e.type === "payment_confirmed")) return "x402 settlement and independent Solana evidence are in progress…";
    if (states.privacy === "running") return "Privacy is reducing context before forwarding…";
    if (states.routing === "running") return "Routing is selecting the destination…";
    if (states.intake === "running") return "Intake is running. The first request after idle may be waking the model backend…";
    return "Starting workflow…";
  }, [busy, states, events]);

  function setNode(step: string, state: NodeState) {
    if (step in initialStates) setStates((previous) => ({ ...previous, [step]: state }));
  }

  function triggerPulse(event: WorkflowEvent) {
    if (event.type !== "handoff_created" || typeof event.payload !== "object" || !event.payload) return;
    const p = event.payload as { source_step_id?: unknown; target_step_id?: unknown };
    setPulseCounter((previous) => {
      const key = previous + 1;
      if (p.source_step_id === "intake" && p.target_step_id === "privacy") setPulse({ key, edge: "intake-privacy", direction: "forward" });
      else if (p.source_step_id === "intake" && p.target_step_id === "routing") setPulse({ key, edge: "intake-routing", direction: "forward" });
      else if (p.source_step_id === "privacy" && p.target_step_id === "routing") setPulse({ key, edge: "privacy-routing", direction: "forward" });
      else if (p.source_step_id === "routing" && p.target_step_id === "legal") setPulse({ key, edge: "routing-legal", direction: "forward" });
      else if (p.source_step_id === "legal" && p.target_step_id === "reviewer") setPulse({ key, edge: "legal-reviewer", direction: "forward" });
      else if (p.source_step_id === "routing" && p.target_step_id === "reviewer") setPulse({ key, edge: "routing-reviewer", direction: "forward" });
      else if (p.source_step_id === "reviewer" && p.target_step_id === "routing") setPulse({ key, edge: "routing-reviewer", direction: "reverse" });
      return key;
    });
  }

  function applyEvent(event: WorkflowEvent) {
    if (seenIds.current.has(event.event_id)) return;
    seenIds.current.add(event.event_id);
    setEvents((previous) => [...previous, event]);
    if (event.type === "agent_started") setNode(event.step_id, "running");
    if (event.type === "agent_completed" || event.type === "review_completed") setNode(event.step_id, "completed");
    if (event.type === "agent_skipped") setNode(event.step_id, "skipped");
    if (event.type === "agent_failed") setNode(event.step_id, "failed");
    if (event.type === "handoff_created") {
      const handoff = event.payload;
      if (isHandoff(handoff)) setHandoffs((previous) => [...previous, handoff]);
    }
    if (event.type === "routing_decision" && typeof event.payload === "object" && event.payload && "department" in event.payload) {
      const department = (event.payload as { department?: unknown }).department;
      if (isPaidDepartment(department)) setSelected(department);
    }
    if (event.type === "revision_requested" && typeof event.payload === "object" && event.payload) {
      const p = event.payload as { mode?: unknown; from_department?: unknown; target_department?: unknown };
      if (p.mode === "reroute_suggested" && isPaidDepartment(p.from_department) && isPaidDepartment(p.target_department)) {
        setRevisionNotice(`Reviewer suggested ${capitalize(p.from_department)} → ${capitalize(p.target_department)}; Routing will decide`);
      } else {
        setRevisionNotice("Reviewer requested one Routing revision");
      }
    }
    triggerPulse(event);
    if (event.type === "workflow_completed") {
      const next = event.payload as FinalRequestCard;
      setCard(next);
      setManual(next.outcome === "manual_review");
      setStatus("idle");
      setActivityOpen(false);
    }
    if (event.type === "workflow_failed") {
      const p = event.payload as { code?: string; message?: string; backend_response_received?: boolean; validation_detail?: string | null };
      setErrorCode(p.code ?? null);
      setBackendResponded(Boolean(p.backend_response_received));
      setValidationDetail(p.validation_detail ?? null);
      setError(p.message ?? "Workflow failed safely.");
      setStatus("failed");
    }
  }

  function switchMode(next: WorkflowScenario) {
    if (busy) return;
    setScenario(next);
    setMessage(next === "paid_legal" ? paidPreset : presets.Technical);
    setEvents([]);
    setHandoffs([]);
    setCard(null);
    setStates(initialStates);
    setSelected(null);
    setError(null);
    setErrorCode(null);
    setTranscript([]);
    setDelegation(null);
    setFailedAgentNote(null);
  }

  function switchChannel(next: Channel) {
    if (busy || next === channel) return;
    setChannel(next);
    switchMode(scenario);
  }

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/api/mcp`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard may be unavailable */ }
  }

  function focusAgenticFinanceDemo() {
    if (busy) return;
    switchMode("paid_legal");
    requestAnimationFrame(() => demoFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function resetRun() {
    seenIds.current.clear();
    setStates(initialStates);
    setSelected(null);
    setCard(null);
    setError(null);
    setErrorCode(null);
    setBackendResponded(false);
    setValidationDetail(null);
    setEvents([]);
    setHandoffs([]);
    setPulse(null);
    setPulseCounter(0);
    setManual(false);
    setRevisionNotice(null);
    setActivityOpen(false);
    setTranscript([]);
    setDelegation(null);
    setFailedAgentNote(null);
    setStatus("running");
  }

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    if (agentMode) return submitViaMcp(trimmed);
    resetRun();
    let terminal = false;
    try {
      const body = paidMode
        ? { message: trimmed, scenario: "paid_legal", client_request_id: crypto.randomUUID() }
        : { message: trimmed, scenario: "standard" };
      const response = await fetch("/api/workflows/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(data?.error?.message ?? "Request could not be started.");
      }
      if (!response.body) throw new Error("Streaming response is unavailable.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;
          const event = JSON.parse(line.slice(6)) as WorkflowEvent;
          applyEvent(event);
          if (event.type === "workflow_completed" || event.type === "workflow_failed") terminal = true;
        }
      }
      if (!terminal) {
        setStatus("interrupted");
        setError("The event stream ended before a terminal workflow event. This run was not treated as success.");
      }
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "The request failed before completion.");
    }
  }

  async function submitViaMcp(trimmed: string) {
    resetRun();
    // Unique per run: ModelRuntimeControl remembers processed event ids across runs.
    const runKey = ++mcpRunRef.current;
    const client = new BrowserMcpClient({
      onTraffic: (entry) => setTranscript((previous) => [...previous, { ...entry, id: ++transcriptIdRef.current }]),
    });
    const fail = (text: string) => { setError(text); setStatus("failed"); };

    const init = await client.initialize((m) => {
      const info = (m.result as { serverInfo?: { name?: string; version?: string } } | undefined)?.serverInfo;
      return `Connected to ${info?.name ?? "server"} ${info?.version ?? ""}`.trim();
    });
    if (!init.ok) return fail(`MCP initialize failed: ${init.message}`);
    const tools = await client.listTools((m) => {
      const list = (m.result as { tools?: Array<{ name: string }> } | undefined)?.tools ?? [];
      return `${list.length} tools: ${list.map((t) => t.name).join(", ")}`;
    });
    if (!tools.ok) return fail(`MCP tools/list failed: ${tools.message}`);

    const tool = paidMode ? "request_legal_consultation" : "submit_request";
    const args: Record<string, unknown> = { message: trimmed, agent_name: MCP_AGENT_NAME, ...(paidMode ? { request_id: crypto.randomUUID() } : {}) };
    const call = await client.callTool(tool, args, {
      summary: paidMode ? "Buy one Legal consultation for this request" : "Route this request",
      summarize: summarizeToolResult,
      onProgress: (p) => {
        const step = p._meta?.["pegas/step"] as StepMeta | undefined;
        if (!step || typeof step.seq !== "number" || step.type === "workflow_completed" || step.type === "workflow_failed") return;
        applyEvent({ event_version: 1, run_id: "mcp", event_id: `mcp-${runKey}-${step.seq}`, seq: step.seq, type: step.type, timestamp: new Date().toISOString(), step_id: step.step_id, agent_id: step.agent_id, payload: null });
      },
    });
    if (!call.ok) {
      if (call.kind === "no_result") {
        setStatus("interrupted");
        setError("The event stream ended before a terminal workflow event. This run was not treated as success.");
        return;
      }
      return fail(call.message);
    }

    const structured = call.result.structuredContent ?? {};
    const chain = structured.delegation_chain;
    if (Array.isArray(chain)) {
      setDelegation({
        chain: chain.map((link: { label?: unknown; identity?: unknown }) => ({ label: String(link.label ?? ""), identity: typeof link.identity === "string" ? link.identity : undefined })),
        note: typeof structured.authority_note === "string" ? structured.authority_note : null,
      });
    }
    const finalCard = (structured.final_card ?? null) as FinalRequestCard | null;
    if (call.result.isError || !finalCard) {
      const failure = structured.failure as { message?: string; failed_agent?: string } | null | undefined;
      const textBlock = call.result.content?.find((c) => c.type === "text")?.text;
      setFailedAgentNote(failure?.failed_agent ? `Stopped at: ${failure.failed_agent}` : null);
      fail(failure?.message ?? (typeof structured.error === "string" ? structured.error : null) ?? textBlock ?? "The MCP tool call failed.");
    } else {
      setCard(finalCard);
      const department = finalCard.paid_department ?? finalCard.department;
      if (isPaidDepartment(department)) setSelected(department);
      setManual(finalCard.outcome === "manual_review");
      setStatus("idle");
    }

    const operationId = structured.operation_id;
    if (paidMode && typeof operationId === "string") {
      await client.callTool("get_payment_evidence", { operation_id: operationId }, { summary: "Show me the stored payment evidence", summarize: summarizeEvidence });
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader active="demo" />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <AgenticFinanceHero onRunDemo={focusAgenticFinanceDemo} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="min-w-0" aria-label="Request demo">
            <div ref={demoFormRef} className={`rounded-3xl border bg-white p-5 card-shadow transition ${paidMode ? "border-indigo-300 shadow-[0_18px_55px_rgba(79,93,245,0.12)]" : "border-slate-200"}`}>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <Mode active={!agentMode} onClick={() => switchChannel("web")}>Web form</Mode>
                <Mode active={agentMode} onClick={() => switchChannel("mcp")}>AI agent via MCP</Mode>
              </div>
              {agentMode && (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                  <p>A built-in MCP client in your browser plays an external AI agent. It discovers Pegas tools and calls them over the Model Context Protocol, the way Claude or Cursor would. It gets a tool, not payment authority.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
                    <span className="min-w-0 break-all">Use it from your own agent: <code className="font-mono text-[11px] text-indigo-700">{mcpEndpoint()}</code></span>
                    <button type="button" onClick={copyEndpoint} className="focus-ring rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-[var(--pegas-blue)] hover:text-[var(--pegas-blue-dark)]">{copied ? "Copied" : "Copy"}</button>
                  </div>
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <Mode active={!paidMode} onClick={() => switchMode("standard")}>Standard request</Mode>
                <Mode active={paidMode} onClick={() => switchMode("paid_legal")}>
                  <span className="inline-flex items-center gap-1.5">Paid Legal <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] text-indigo-700">x402 LIVE</span></span>
                </Mode>
              </div>
              {paidMode && (
                <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-xs leading-5 text-indigo-900">
                  <b>Agent-funded demo</b> · Solana Devnet · 0.01 test USDC per consultation<br />No wallet connection. No real funds.
                </div>
              )}
              <ModelRuntimeControl events={runtimeEvents} running={busy} />
              <label htmlFor="request" className="mt-5 block text-sm font-semibold text-slate-900">Request</label>
              <textarea id="request" value={message} onChange={(e) => setMessage(e.target.value)} disabled={busy} maxLength={4000} rows={8} className="focus-ring mt-3 min-h-[210px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none disabled:opacity-60" />
              {!paidMode && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(presets).map(([label, value]) => (
                    <button key={label} type="button" disabled={busy} onClick={() => setMessage(value)} className="focus-ring rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[var(--pegas-blue)] hover:text-[var(--pegas-blue-dark)] disabled:opacity-50">{label}</button>
                  ))}
                </div>
              )}
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <strong>Use fictional requests.</strong> Do not enter passwords, API keys, wallet secrets, or real personal data.
              </div>
              <button type="button" onClick={submit} disabled={busy || !message.trim()} aria-busy={busy} className="pegas-primary-button focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(63,94,251,0.2)] disabled:cursor-not-allowed">
                {busy && <span className="pegas-spinner" aria-hidden="true" />}
                {agentMode ? (busy ? "Agent is calling Pegas…" : "Send via MCP agent") : busy ? "Running workflow…" : "Send a request"}
              </button>
              {liveLabel && <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--pegas-blue-dark)]"><span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--pegas-blue)]" /><span>{liveLabel}</span></div>}
              {revisionNotice && <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-semibold text-violet-800">{revisionNotice}</div>}
            </div>
            {agentMode && <McpAgentPanel entries={transcript} delegation={delegation} running={busy} />}
          </section>

          <div className="min-w-0 space-y-6">
            <WorkflowGraph states={states} selected={selected} pulse={pulse} manual={manual} paidMode={paidMode} />
            <AgenticFinanceTimeline events={events} active={paidMode} />
            {(error || status === "interrupted") && (
              <div className={`rounded-3xl border p-5 ${legalDeliveryIncomplete || paymentGuardrailStopped ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"}`}>
                <p className={`text-sm font-bold ${legalDeliveryIncomplete || paymentGuardrailStopped ? "text-amber-900" : "text-rose-800"}`}>{status === "interrupted" ? "Interrupted" : legalDeliveryIncomplete ? "Payment verified · Legal delivery incomplete" : paymentGuardrailStopped ? "Payment guardrail stopped this run" : "Workflow error"}</p>
                <p className={`mt-2 text-sm leading-6 ${legalDeliveryIncomplete || paymentGuardrailStopped ? "text-amber-800" : "text-rose-700"}`}>{error}</p>
                {!legalDeliveryIncomplete && !paymentGuardrailStopped && backendResponded && <p className="mt-2 text-xs font-semibold text-rose-700">Backend response received. The failure happened during structured-output validation.</p>}
                {failedAgentNote && <p className="mt-2 text-xs font-semibold text-rose-700">{failedAgentNote}</p>}
                {!legalDeliveryIncomplete && !paymentGuardrailStopped && validationDetail && <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 font-mono text-[11px] leading-5 text-rose-800">{validationDetail}</p>}
              </div>
            )}
            {card && <WorkflowResultCard card={card} />}
            {paidMode && <AgenticPaymentInspector events={events} card={card} />}
            <HandoffInspector handoffs={handoffs} />
            {compactEvents.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <button type="button" onClick={() => setActivityOpen((value) => !value)} className="focus-ring flex w-full items-center justify-between rounded-xl text-left">
                  <span><span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Activity</span><span className="mt-1 block text-sm font-semibold text-slate-800">{activityOpen ? "Hide activity" : "View activity"}</span></span>
                  <span className="text-xs text-slate-400">{compactEvents.length} events</span>
                </button>
                {activityOpen && <div className="mt-4 space-y-2">{compactEvents.map((event) => <div key={event.event_id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 text-xs"><span className="font-semibold text-slate-700">{event.type.replaceAll("_", " ")}</span><span className="text-slate-400">{event.agent_id ?? event.step_id}</span></div>)}</div>}
              </section>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-7 text-center">
          <Link href="/vision" className="focus-ring inline-flex rounded-lg text-sm font-semibold text-[var(--pegas-blue-dark)] hover:text-indigo-700">
            Explore the thinking behind the demo →
          </Link>
        </div>
      </main>
    </div>
  );
}

function mcpEndpoint() {
  return typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`;
}

function summarizeToolResult(message: JsonRpcMessage) {
  const result = (message.result ?? {}) as McpToolCallResult;
  const s = result.structuredContent ?? {};
  const failure = s.failure as { message?: string } | null | undefined;
  if (result.isError) return `Error: ${failure?.message ?? (typeof s.error === "string" ? s.error : "tool call failed")}`;
  const parts = [`Outcome ${String(s.outcome ?? "unknown")}`];
  const payment = s.payment as { auth_passed?: number | null; auth_total?: number | null; confirmation_status?: string | null } | null | undefined;
  if (payment) {
    if (typeof payment.auth_total === "number") parts.push(`AUTH ${payment.auth_passed}/${payment.auth_total}`);
    if (payment.confirmation_status) parts.push(`tx ${payment.confirmation_status}`);
  } else if (typeof s.department === "string") parts.push(s.department);
  if (s.replayed === true) parts.push("replayed");
  return parts.join(" · ");
}

function summarizeEvidence(message: JsonRpcMessage) {
  const result = (message.result ?? {}) as McpToolCallResult;
  const s = result.structuredContent ?? {};
  if (result.isError) return `Error: ${typeof s.error === "string" ? s.error : "evidence unavailable"}`;
  const evidence = s.evidence as { authority?: { principal_id?: string; state?: string } } | null | undefined;
  if (!evidence?.authority) return `Operation ${String(s.state ?? "")}: no payment evidence recorded`;
  const principal = evidence.authority.principal_id ?? "unknown";
  return `Principal on the mandate: ${principal}${principal === "mcp-external-agent" ? " (not verified)" : ""} · mandate ${evidence.authority.state ?? "unknown"}`;
}

function Mode({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{children}</button>;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
