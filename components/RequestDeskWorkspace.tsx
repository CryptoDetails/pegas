"use client";

import { useMemo, useRef, useState } from "react";
import { AppHeader } from "./AppHeader";
import { HandoffInspector } from "./HandoffInspector";
import { WorkflowGraph, type GraphStates, type HandoffPulse, type NodeState } from "./WorkflowGraph";
import { WorkflowResultCard } from "./WorkflowResultCard";
import type { Department, FinalRequestCard, Handoff, WorkflowEvent } from "@/lib/workflow/types";

const presets = {
  Technical: "Our fictional partner API returns 401 after we rotated test credentials. Please help identify the technical next step for the integration team.",
  Business: "A fictional wallet partner has reached out about a potential co-marketing campaign around its upcoming product launch. Please identify the right team and recommend the next step.",
  Finance: "A fictional partner says invoice INV-DEMO-104 appears to include the same service charge twice. Please review the billing request and suggest the next step.",
  Privacy: "This fictional request includes confidential partner pricing for an unreleased agreement. Please route it to the appropriate team without forwarding unnecessary details.",
};

const initialStates: GraphStates = { intake: "idle", privacy: "idle", routing: "idle", reviewer: "idle" };

function isDepartment(value: unknown): value is Department { return value === "technical" || value === "business" || value === "finance"; }
function isHandoff(value: unknown): value is Handoff {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Handoff>;
  return typeof item.handoff_id === "string" && typeof item.source_agent_id === "string" && typeof item.target_agent_id === "string" && typeof item.reason === "string" && Boolean(item.forwarded_context && typeof item.forwarded_context === "object") && Array.isArray(item.withheld_field_names);
}

export function RequestDeskWorkspace() {
  const [message, setMessage] = useState(presets.Technical);
  const [states, setStates] = useState<GraphStates>(initialStates);
  const [selected, setSelected] = useState<Department | null>(null);
  const [card, setCard] = useState<FinalRequestCard | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "failed" | "interrupted">("idle");
  const [error, setError] = useState<string | null>(null);
  const [backendResponded, setBackendResponded] = useState(false);
  const [validationDetail, setValidationDetail] = useState<string | null>(null);
  const [pulse, setPulse] = useState<HandoffPulse>(null);
  const [pulseCounter, setPulseCounter] = useState(0);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [manual, setManual] = useState(false);
  const [revisionNotice, setRevisionNotice] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const seenIds = useRef(new Set<string>());
  const busy = status === "running";

  const compactEvents = useMemo(() => events.filter((event) => event.type !== "heartbeat").slice(-18), [events]);
  const liveLabel = useMemo(() => {
    if (!busy) return null;
    if (states.reviewer === "running") return "Reviewer is checking the proposal…";
    if (states.privacy === "running") return "Privacy is reducing context before forwarding…";
    if (states.routing === "running") return "Routing is selecting the destination…";
    if (states.intake === "running") return "Intake is running. The first request after idle may be waking the model backend…";
    return "Starting workflow…";
  }, [busy, states]);

  function setNode(step: string, state: NodeState) {
    if (step in initialStates) setStates((previous) => ({ ...previous, [step]: state }));
  }

  function triggerPulse(event: WorkflowEvent) {
    if (event.type !== "handoff_created" || typeof event.payload !== "object" || !event.payload) return;
    const payload = event.payload as { source_step_id?: unknown; target_step_id?: unknown };
    const source = payload.source_step_id;
    const target = payload.target_step_id;
    setPulseCounter((previous) => {
      const key = previous + 1;
      if (source === "intake" && target === "privacy") setPulse({ key, edge: "intake-privacy", direction: "forward" });
      else if (source === "intake" && target === "routing") setPulse({ key, edge: "intake-routing", direction: "forward" });
      else if (source === "privacy" && target === "routing") setPulse({ key, edge: "privacy-routing", direction: "forward" });
      else if (source === "routing" && target === "reviewer") setPulse({ key, edge: "routing-reviewer", direction: "forward" });
      else if (source === "reviewer" && target === "routing") setPulse({ key, edge: "routing-reviewer", direction: "reverse" });
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
      if (isDepartment(department)) setSelected(department);
    }

    if (event.type === "revision_requested" && typeof event.payload === "object" && event.payload) {
      const payload = event.payload as { mode?: unknown; from_department?: unknown; target_department?: unknown };
      const from = payload.from_department;
      const target = payload.target_department;
      if (payload.mode === "reroute_suggested" && isDepartment(from) && isDepartment(target)) setRevisionNotice(`Reviewer suggested ${capitalize(from)} → ${capitalize(target)}; Routing will decide`);
      else setRevisionNotice("Reviewer requested one Routing revision");
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
      const payload = event.payload as { message?: string; backend_response_received?: boolean; validation_detail?: string | null };
      setBackendResponded(Boolean(payload.backend_response_received));
      setValidationDetail(payload.validation_detail ?? null);
      setError(payload.message ?? "Workflow failed safely.");
      setStatus("failed");
    }
  }

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    seenIds.current.clear();
    setStates(initialStates); setSelected(null); setCard(null); setError(null); setBackendResponded(false); setValidationDetail(null); setEvents([]); setHandoffs([]); setPulse(null); setPulseCounter(0); setManual(false); setRevisionNotice(null); setActivityOpen(false); setStatus("running");
    let terminal = false;
    try {
      const response = await fetch("/api/workflows/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: trimmed }) });
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
      if (!terminal) { setStatus("interrupted"); setError("The event stream ended before a terminal workflow event. This run was not treated as success."); }
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "The request failed before completion.");
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader active="demo" />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
          <section className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--pegas-border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--pegas-blue-dark)]"><span className="h-2 w-2 rounded-full bg-[var(--pegas-cyan)]" />Request Desk · Phase 4</span>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">One request. The right team.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">Watch one self-hosted model intake, protect, route, and review a fictional request with inspectable agent handoffs.</p>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 card-shadow">
              <label htmlFor="request" className="text-sm font-semibold text-slate-900">Request</label>
              <textarea id="request" value={message} onChange={(event) => setMessage(event.target.value)} disabled={busy} maxLength={4000} rows={8} className="focus-ring mt-3 min-h-[210px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none disabled:opacity-60" />
              <div className="mt-3 flex flex-wrap gap-2">{Object.entries(presets).map(([label, value]) => <button key={label} type="button" disabled={busy} onClick={() => setMessage(value)} className="focus-ring rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[var(--pegas-blue)] hover:text-[var(--pegas-blue-dark)] disabled:opacity-50">{label}</button>)}</div>
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Use fictional requests.</strong> Do not enter passwords, API keys, or real personal data.</div>
              <p className="mt-3 text-xs leading-5 text-slate-500">The first run after idle can take around 90 seconds based on a prior observed run. Follow-up calls are typically much faster, but startup time can vary.</p>
              <button type="button" onClick={submit} disabled={busy || !message.trim()} aria-busy={busy} className="pegas-primary-button focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(63,94,251,0.2)] disabled:cursor-not-allowed">{busy && <span className="pegas-spinner" aria-hidden="true" />}{busy ? "Running workflow…" : "Send a request"}</button>
              {liveLabel && <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--pegas-blue-dark)]"><span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--pegas-blue)]" /><span>{liveLabel}</span></div>}
              {revisionNotice && <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-semibold text-violet-800">{revisionNotice}</div>}
            </div>
          </section>

          <div className="min-w-0 space-y-6">
            <WorkflowGraph states={states} selected={selected} pulse={pulse} manual={manual} />
            {(error || status === "interrupted") && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5"><p className="text-sm font-bold text-rose-800">{status === "interrupted" ? "Interrupted" : "Workflow error"}</p><p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>{backendResponded && <p className="mt-2 text-xs font-semibold text-rose-700">Backend response received. The failure happened during structured-output validation.</p>}{validationDetail && <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 font-mono text-[11px] leading-5 text-rose-800">{validationDetail}</p>}</div>}
            {card && <WorkflowResultCard card={card} />}
            <HandoffInspector handoffs={handoffs} />
            {compactEvents.length > 0 && <section className="rounded-3xl border border-slate-200 bg-white p-5"><button type="button" onClick={() => setActivityOpen((value) => !value)} className="focus-ring flex w-full items-center justify-between rounded-xl text-left"><span><span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Activity</span><span className="mt-1 block text-sm font-semibold text-slate-800">{activityOpen ? "Hide activity" : "View activity"}</span></span><span className="text-xs text-slate-400">{compactEvents.length} events</span></button>{activityOpen && <div className="mt-4 space-y-2">{compactEvents.map((event) => <div key={event.event_id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 text-xs"><span className="font-semibold text-slate-700">{event.type.replaceAll("_", " ")}</span><span className="text-slate-400">{event.agent_id ?? event.step_id}</span></div>)}</div>}</section>}
          </div>
        </div>
      </main>
    </div>
  );
}

function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
