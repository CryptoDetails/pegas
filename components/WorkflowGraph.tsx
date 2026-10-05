"use client";

export type NodeState = "idle" | "running" | "completed" | "skipped" | "failed" | "manual";
export type GraphStates = Record<"intake" | "privacy" | "technical" | "business" | "finance" | "reviewer", NodeState>;
export type HandoffPulse = {
  key: number;
  edge: "intake-privacy" | "intake-department" | "privacy-department" | "department-reviewer";
  direction: "forward" | "reverse";
} | null;

export function WorkflowGraph({ states, selected, pulse, manual }: { states: GraphStates; selected: "technical" | "business" | "finance" | null; pulse: HandoffPulse; manual: boolean; }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 card-shadow">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Live workflow</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Real backend transitions</h2></div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">No staged timers</span>
      </div>

      <div className="mt-7 overflow-x-auto pb-2 sm:overflow-x-visible">
        <div className="mx-auto grid w-full min-w-[620px] grid-cols-[minmax(0,1fr)_minmax(20px,0.42fr)_minmax(0,0.92fr)_minmax(20px,0.42fr)_minmax(0,2.35fr)_minmax(20px,0.42fr)_minmax(0,1fr)] items-center gap-0 sm:min-w-0">
          <Node label="Intake" state={states.intake} />
          <Edge active={states.privacy !== "idle"} pulse={pulse?.edge === "intake-privacy" ? pulse : null} />
          <Node label="Privacy" state={states.privacy} />
          <Edge active={Boolean(selected) && (states.privacy === "completed" || states.privacy === "skipped")} pulse={pulse?.edge === "privacy-department" || pulse?.edge === "intake-department" ? pulse : null} />
          <div className="min-w-0 grid gap-3">
            <Node label="Technical" state={states.technical} compact selected={selected === "technical"} />
            <Node label="Business" state={states.business} compact selected={selected === "business"} />
            <Node label="Finance" state={states.finance} compact selected={selected === "finance"} />
          </div>
          <Edge active={Boolean(selected) && states.reviewer !== "idle"} pulse={pulse?.edge === "department-reviewer" ? pulse : null} />
          <Node label="Reviewer" state={manual && states.reviewer === "idle" ? "manual" : states.reviewer} />
        </div>
      </div>
    </section>
  );
}

function Node({ label, state, compact = false, selected = false }: { label: string; state: NodeState; compact?: boolean; selected?: boolean; }) {
  const classes: Record<NodeState, string> = {
    idle: "border-slate-200 bg-slate-50 text-slate-500",
    running: "border-[var(--pegas-blue)] bg-[var(--pegas-blue-soft)] text-[var(--pegas-blue-dark)] shadow-[0_0_0_4px_rgba(63,94,251,0.08)]",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
    skipped: "border-slate-200 bg-slate-50 text-slate-300",
    failed: "border-rose-200 bg-rose-50 text-rose-700",
    manual: "border-amber-200 bg-amber-50 text-amber-800",
  };
  const selectedClass = selected && state !== "running" ? "ring-2 ring-[var(--pegas-border)] ring-offset-2" : "";
  const stateLabel = state === "skipped" && label === "Privacy" ? "not needed" : state;
  return <div className={`min-w-0 rounded-2xl border px-2 text-center font-semibold transition sm:px-3 ${compact ? "py-3 text-xs sm:text-sm" : "py-5 text-xs sm:text-sm"} ${classes[state]} ${selectedClass}`}><span className="block truncate">{label}</span><span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-wider opacity-70 sm:text-[10px] sm:tracking-widest">{stateLabel}</span></div>;
}

function Edge({ active, pulse }: { active: boolean; pulse: HandoffPulse }) {
  return <div className="relative mx-1 h-1 rounded-full bg-slate-200 sm:mx-2"><div className={`absolute inset-0 rounded-full transition ${active ? "pegas-gradient-fill" : "bg-transparent"}`} />{active && pulse && <span key={pulse.key} className={`${pulse.direction === "reverse" ? "handoff-pulse-reverse" : "handoff-pulse"} absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--pegas-cyan)] shadow-[0_0_18px_rgba(24,208,255,0.8)]`} />}</div>;
}
