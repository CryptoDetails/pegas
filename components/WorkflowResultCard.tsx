import type { FinalRequestCard } from "@/lib/workflow/types";

export function WorkflowResultCard({ card }: { card: FinalRequestCard }) {
  const routed = card.outcome === "routed_demo";
  const needsInfo = card.outcome === "needs_information";
  const correctionLabel = correctionSummary(card);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 card-shadow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Final request card</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {routed ? "Ready for department review" : needsInfo ? "More information needed" : "Manual review required"}
          </h2>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${routed ? "bg-emerald-50 text-emerald-700" : needsInfo ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"}`}>
          {card.outcome.replaceAll("_", " ")}
        </span>
      </div>

      {correctionLabel && (
        <div className="mt-5 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800">
          {correctionLabel}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Fact label="Department" value={card.department ?? "Not selected"} />
        <Fact label="Priority" value={card.priority ?? "—"} />
        <Fact label="Review" value={card.review_status.replaceAll("_", " ")} />
      </div>
      {card.summary && <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Summary</p><p className="mt-2 text-sm leading-6 text-slate-700">{card.summary}</p></div>}
      {card.department_note && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Department brief</p><p className="mt-1 text-sm leading-6 text-slate-700">{card.department_note}</p></div>}
      {card.next_action && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Next action</p><p className="mt-1 text-sm leading-6 text-slate-700">{card.next_action}</p></div>}
      <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Route explanation</p><p className="mt-1 text-sm leading-6 text-slate-700">{card.route_explanation}</p></div>
      {card.clarification_question && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Clarification</p><p className="mt-2 text-sm font-medium text-amber-950">{card.clarification_question}</p></div>}
    </section>
  );
}

function correctionSummary(card: FinalRequestCard) {
  if (card.revision_count !== 1 || !card.initial_department || !card.department) return null;
  if (card.initial_department === card.department) return "Revised once";
  return `Rerouted ${capitalize(card.initial_department)} → ${capitalize(card.department)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold capitalize text-slate-800">{value}</p></div>;
}
