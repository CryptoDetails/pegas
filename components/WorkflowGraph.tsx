"use client";

export type NodeState = "idle" | "running" | "completed" | "skipped" | "failed" | "manual";
export type GraphStates = Record<"intake" | "technical" | "business" | "finance" | "reviewer", NodeState>;

const labels = { intake:"Intake", technical:"Technical", business:"Business", finance:"Finance", reviewer:"Reviewer" } as const;

export function WorkflowGraph({ states, selected, pulseKey, manual }: { states: GraphStates; selected: "technical"|"business"|"finance"|null; pulseKey: number; manual: boolean }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 card-shadow">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Live workflow</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Backend events drive every state</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">No staged timers</span></div>
      <div className="mt-7 overflow-x-auto pb-2">
        <div className="mx-auto grid min-w-[690px] grid-cols-[130px_95px_330px_95px_130px] items-center gap-0">
          <Node label={labels.intake} state={states.intake} />
          <Edge active={Boolean(selected)} pulseKey={pulseKey} />
          <div className="grid gap-3">
            <Node label={labels.technical} state={states.technical} compact />
            <Node label={labels.business} state={states.business} compact />
            <Node label={labels.finance} state={states.finance} compact />
          </div>
          <Edge active={Boolean(selected) && states.reviewer !== "idle"} pulseKey={pulseKey > 1 ? pulseKey : 0} />
          <Node label={labels.reviewer} state={manual && states.reviewer === "idle" ? "manual" : states.reviewer} />
        </div>
      </div>
    </section>
  );
}

function Node({ label, state, compact=false }: { label:string; state:NodeState; compact?:boolean }) {
  const classes: Record<NodeState,string> = {
    idle:"border-slate-200 bg-slate-50 text-slate-500",
    running:"border-[var(--pegas-blue)] bg-[var(--pegas-blue-soft)] text-[var(--pegas-blue-dark)] shadow-[0_0_0_4px_rgba(63,94,251,0.08)]",
    completed:"border-emerald-200 bg-emerald-50 text-emerald-800",
    skipped:"border-slate-200 bg-slate-50 text-slate-300",
    failed:"border-rose-200 bg-rose-50 text-rose-700",
    manual:"border-amber-200 bg-amber-50 text-amber-800",
  };
  return <div className={`rounded-2xl border px-3 text-center font-semibold transition ${compact?"py-3 text-sm":"py-5 text-sm"} ${classes[state]}`}><span>{label}</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-widest opacity-70">{state}</span></div>;
}

function Edge({ active, pulseKey }: { active:boolean; pulseKey:number }) {
  return <div className="relative mx-2 h-1 rounded-full bg-slate-200"><div className={`absolute inset-0 rounded-full transition ${active?"pegas-gradient-fill":"bg-transparent"}`} />{active && pulseKey>0 && <span key={pulseKey} className="handoff-pulse absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--pegas-cyan)] shadow-[0_0_18px_rgba(24,208,255,0.8)]" />}</div>;
}
