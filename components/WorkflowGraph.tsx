"use client";

import type { PaidDepartment } from "@/lib/workflow/types";

export type NodeState = "idle" | "running" | "completed" | "skipped" | "failed" | "manual";
export type GraphStates = Record<"intake" | "privacy" | "routing" | "legal" | "reviewer", NodeState>;
export type HandoffPulse = { key:number; edge:"intake-privacy"|"intake-routing"|"privacy-routing"|"routing-reviewer"|"routing-legal"|"legal-reviewer"; direction:"forward"|"reverse" } | null;

export function WorkflowGraph({ states, selected, pulse, manual, paidMode = false }: { states: GraphStates; selected: PaidDepartment | null; pulse: HandoffPulse; manual: boolean; paidMode?: boolean }) {
  const departments = paidMode ? (["technical", "business", "finance", "legal"] as const) : (["technical", "business", "finance"] as const);
  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 card-shadow sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Live workflow</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Real backend transitions</h2></div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">No staged timers</span>
      </div>

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)_32px_minmax(0,1.2fr)_32px_minmax(0,1fr)] items-center gap-0">
        <Node label="Intake" state={states.intake} />
        <Edge active={states.privacy !== "idle"} pulse={pulse?.edge === "intake-privacy" ? pulse : null} />
        <Node label="Privacy" state={states.privacy} />
        <Edge active={states.routing !== "idle"} pulse={pulse?.edge === "privacy-routing" || pulse?.edge === "intake-routing" ? pulse : null} />
        <div className="min-w-0">
          <Node label="Routing" state={states.routing} />
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {departments.map((department) => <span key={department} className={`rounded-full border px-2 py-1 text-[10px] font-bold capitalize ${selected === department ? "border-[var(--pegas-blue)] bg-[var(--pegas-blue-soft)] text-[var(--pegas-blue-dark)]" : "border-slate-200 bg-slate-50 text-slate-400"}`}>{department}</span>)}
          </div>
        </div>
        <Edge active={states.reviewer !== "idle"} pulse={pulse?.edge === "routing-reviewer" ? pulse : null} />
        <Node label="Reviewer" state={manual && states.reviewer === "idle" ? "manual" : states.reviewer} />
      </div>

      <div className={`mt-5 rounded-2xl border p-4 transition ${paidMode ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 bg-slate-50/70"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${paidMode ? "text-indigo-600" : "text-slate-400"}`}>Paid branch · x402 LIVE</p><p className="mt-1 text-xs text-slate-500">Visible before activation. Runtime progression still comes only from real workflow events.</p></div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${paidMode ? "bg-indigo-100 text-indigo-700" : "bg-white text-slate-400"}`}>{paidMode ? "SELECTED" : "DORMANT"}</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_20px_1fr_20px_1fr_20px_1fr_20px_1fr] sm:items-center">
          <BranchNode label="Routing" active={paidMode} state={states.routing} />
          <BranchArrow />
          <ConceptNode label="Bounded authority" active={paidMode} />
          <BranchArrow />
          <ConceptNode label="402 / x402" active={paidMode} />
          <BranchArrow />
          <BranchNode label="Legal Advisor" active={paidMode} state={states.legal} />
          <BranchArrow />
          <BranchNode label="Reviewer" active={paidMode} state={manual && states.reviewer === "idle" ? "manual" : states.reviewer} />
        </div>
      </div>
    </section>
  );
}

function Node({ label, state }: { label: string; state: NodeState }) {
  const classes: Record<NodeState, string> = {
    idle: "border-slate-200 bg-slate-50 text-slate-500",
    running: "border-[var(--pegas-blue)] bg-[var(--pegas-blue-soft)] text-[var(--pegas-blue-dark)] shadow-[0_0_0_4px_rgba(63,94,251,0.08)]",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
    skipped: "border-slate-200 bg-slate-50 text-slate-300",
    failed: "border-rose-200 bg-rose-50 text-rose-700",
    manual: "border-amber-200 bg-amber-50 text-amber-800",
  };
  const stateLabel = state === "skipped" && label === "Privacy" ? "not needed" : state;
  return <div className={`min-w-0 rounded-2xl border px-2 py-5 text-center text-xs font-semibold transition sm:px-3 sm:text-sm ${classes[state]}`}><span className="block truncate">{label}</span><span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-wider opacity-70 sm:text-[10px] sm:tracking-widest">{stateLabel}</span></div>;
}

function BranchNode({ label, active, state }: { label: string; active: boolean; state: NodeState }) {
  if (!active || state === "idle") return <ConceptNode label={label} active={active} />;
  return <div className="rounded-xl"><Node label={label} state={state} /></div>;
}

function ConceptNode({ label, active }: { label: string; active: boolean }) {
  return <div className={`rounded-xl border px-2.5 py-3 text-center text-[11px] font-semibold transition ${active ? "border-indigo-200 bg-white text-indigo-800" : "border-slate-200 bg-white/70 text-slate-400"}`}>{label}</div>;
}

function BranchArrow() {
  return <div className="text-center text-slate-300"><span className="sm:hidden">↓</span><span className="hidden sm:inline">→</span></div>;
}

function Edge({ active, pulse }: { active: boolean; pulse: HandoffPulse }) {
  return <div className="relative mx-1 h-1 rounded-full bg-slate-200"><div className={`absolute inset-0 rounded-full transition ${active ? "pegas-gradient-fill" : "bg-transparent"}`} />{active && pulse && <span key={pulse.key} className={`${pulse.direction === "reverse" ? "handoff-pulse-reverse" : "handoff-pulse"} absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--pegas-cyan)] shadow-[0_0_18px_rgba(24,208,255,0.8)]`} />}</div>;
}
