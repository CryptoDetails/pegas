"use client";

import { useMemo, useRef, useState } from "react";
import { AppHeader } from "./AppHeader";
import { WorkflowGraph, type GraphStates, type NodeState } from "./WorkflowGraph";
import { WorkflowResultCard } from "./WorkflowResultCard";
import type { FinalRequestCard, WorkflowEvent } from "@/lib/workflow/types";

const presets = {
  Technical:
    "Our fictional partner API returns 401 after we rotated test credentials. Please help identify the technical next step for the integration team.",
  Business:
    "A fictional wallet partner wants to discuss a co-marketing campaign for its upcoming product launch. Please route this to the right team and suggest the next step.",
  Finance:
    "A fictional partner says invoice INV-DEMO-104 appears to include the same service charge twice. Please review the billing request and suggest the next step.",
};

const initialStates: GraphStates = {
  intake: "idle",
  technical: "idle",
  business: "idle",
  finance: "idle",
  reviewer: "idle",
};

export function RequestDeskWorkspace() {
  const [message, setMessage] = useState(presets.Technical);
  const [states, setStates] = useState<GraphStates>(initialStates);
  const [selected, setSelected] = useState<"technical" | "business" | "finance" | null>(null);
  const [card, setCard] = useState<FinalRequestCard | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "failed" | "interrupted">("idle");
  const [error, setError] = useState<string | null>(null);
  const [backendResponded, setBackendResponded] = useState(false);
  const [validationDetail, setValidationDetail] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [manual, setManual] = useState(false);
  const seenIds = useRef(new Set<string>());
  const busy = status === "running";

  const compactEvents = useMemo(
    () => events.filter((event) => event.type !== "heartbeat").slice(-8),
    [events],
  );

  const liveLabel = useMemo(() => {
    if (!busy) return null;
    if (states.reviewer === "running") return "Reviewer is checking the proposal…";
    if (states.technical === "running") return "Technical agent is working…";
    if (states.business === "running") return "Business agent is working…";
    if (states.finance === "running") return "Finance agent is working…";
    if (states.intake === "running") return "Intake is running. The first request after idle may be waking the model backend…";
    return "Starting workflow…";
  }, [busy, states]);

  function setNode(step: string, state: NodeState) {
    if (step in initialStates) {
      setStates((previous) => ({ ...previous, [step]: state }));
    }
  }

  function applyEvent(event: WorkflowEvent) {
    if (seenIds.current.has(event.event_id)) return;
    seenIds.current.add(event.event_id);
    setEvents((previous) => [...previous, event]);

    if (event.type === "agent_started") setNode(event.step_id, "running");
    if (event.type === "agent_completed" || event.type === "review_completed") {
      setNode(event.step_id, "completed");
    }
    if (event.type === "agent_skipped") setNode(event.step_id, "skipped");
    if (event.type === "agent_failed") setNode(event.step_id, "failed");

    if (
      event.type === "routing_decision" &&
      typeof event.payload === "object" &&
      event.payload &&
      "department" in event.payload
    ) {
      const department = (event.payload as { department?: unknown }).department;
      if (department === "technical" || department === "business" || department === "finance") {
        setSelected(department);
      }
    }

    if (event.type === "handoff_created") setPulseKey((key) => key + 1);

    if (event.type === "workflow_completed") {
      const next = event.payload as FinalRequestCard;
      setCard(next);
      setManual(next.outcome === "manual_review");
      setStatus("idle");
    }

    if (event.type === "workflow_failed") {
      const payload = event.payload as {
        message?: string;
        backend_response_received?: boolean;
        validation_detail?: string | null;
      };
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
    setStates(initialStates);
    setSelected(null);
    setCard(null);
    setError(null);
    setBackendResponded(false);
    setValidationDetail(null);
    setEvents([]);
    setPulseKey(0);
    setManual(false);
    setStatus("running");

    let terminal = false;

    try {
      const response = await fetch("/api/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
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
          if (event.type === "workflow_completed" || event.type === "workflow_failed") {
            terminal = true;
          }
        }
      }

      if (!terminal) {
        setStatus("interrupted");
        setError(
          "The event stream ended before a terminal workflow event. This run was not treated as success.",
        );
      }
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "The request failed before completion.");
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader active="demo" />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <section>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--pegas-border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--pegas-blue-dark)]">
              <span className="h-2 w-2 rounded-full bg-[var(--pegas-cyan)]" />
              Request Desk · Phase 1
            </span>

            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">
              One request. Watch the agents work.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              A self-hosted open model classifies the request, selects exactly one specialist department,
              then sends the proposal to a separate reviewer.
            </p>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 card-shadow">
              <label htmlFor="request" className="text-sm font-semibold text-slate-900">
                Request
              </label>
              <textarea
                id="request"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={busy}
                maxLength={4000}
                rows={8}
                className="focus-ring mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none disabled:opacity-60"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(presets).map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    disabled={busy}
                    onClick={() => setMessage(value)}
                    className="focus-ring rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[var(--pegas-blue)] hover:text-[var(--pegas-blue-dark)] disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <strong>Use fictional requests.</strong> Do not enter passwords, API keys, or real personal data.
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                The first run after idle can take around 90 seconds based on a prior observed run. Follow-up
                calls are typically much faster, but startup time can vary.
              </p>

              <button
                type="button"
                onClick={submit}
                disabled={busy || !message.trim()}
                aria-busy={busy}
                className="pegas-primary-button focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(63,94,251,0.2)] disabled:cursor-not-allowed"
              >
                {busy && <span className="pegas-spinner" aria-hidden="true" />}
                {busy ? "Running workflow…" : "Send a request"}
              </button>

              {liveLabel && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--pegas-blue-dark)]">
                  <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--pegas-blue)]" />
                  <span>{liveLabel}</span>
                </div>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <WorkflowGraph
              states={states}
              selected={selected}
              pulseKey={pulseKey}
              manual={manual}
            />

            {(error || status === "interrupted") && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                <p className="text-sm font-bold text-rose-800">
                  {status === "interrupted" ? "Interrupted" : "Workflow error"}
                </p>
                <p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>
                {backendResponded && (
                  <p className="mt-2 text-xs font-semibold text-rose-700">
                    Backend response received. The failure happened during structured-output validation.
                  </p>
                )}
                {validationDetail && (
                  <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 font-mono text-[11px] leading-5 text-rose-800">
                    {validationDetail}
                  </p>
                )}
              </div>
            )}

            {card && <WorkflowResultCard card={card} />}

            {compactEvents.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Event trace</p>
                  <p className="text-xs text-slate-400">Structured public events only</p>
                </div>
                <div className="mt-4 space-y-2">
                  {compactEvents.map((event) => (
                    <div
                      key={event.event_id}
                      className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-slate-700">
                        {event.type.replaceAll("_", " ")}
                      </span>
                      <span className="text-slate-400">{event.agent_id ?? event.step_id}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
