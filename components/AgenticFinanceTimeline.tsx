import type { WorkflowEvent } from "@/lib/workflow/types";

const STEPS = [
  ["consultation_requested", "Consultation requested", "authority"],
  ["mandate_created", "Mandate created", "authority"],
  ["counterparty_verified", "Counterparty identified", "authority"],
  ["payment_required", "402 quote", "payment"],
  ["mandate_policy_checked", "Authority checked", "payment"],
  ["payment_authorized", "Signed / authorization created", "payment"],
  ["payment_settled", "Settled", "evidence"],
  ["payment_confirmed", "On-chain confirmed", "evidence"],
  ["mandate_consumed", "Mandate consumed", "evidence"],
  ["consultation_completed", "Legal response", "delivery"],
] as const;

const PHASES = {
  authority: "Authority",
  payment: "x402 payment",
  evidence: "Settlement evidence",
  delivery: "Specialist delivery",
} as const;

export function AgenticFinanceTimeline({ events, active }: { events: WorkflowEvent[]; active: boolean }) {
  const seen = new Set(events.map((event) => event.type));
  return (
    <section className={`rounded-3xl border bg-white p-5 card-shadow transition ${active ? "border-indigo-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className={`text-xs font-bold uppercase tracking-[0.18em] ${active ? "text-indigo-500" : "text-slate-400"}`}>Agentic finance timeline</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Authority → payment → evidence → Legal</h2></div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>{active ? "Event driven · selected" : "Event driven · preview"}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {active ? "Steps advance only when the corresponding WorkflowEvent arrives." : "Dormant architecture preview. Selecting Paid Legal activates the branch; this preview does not simulate progress."}
      </p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {STEPS.map(([type, label, phase], index) => {
          const complete = seen.has(type);
          return (
            <div key={type} className={`rounded-2xl border p-3 ${complete ? "border-emerald-200 bg-emerald-50" : active ? "border-indigo-100 bg-indigo-50/25" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2"><span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${complete ? "text-emerald-700" : active ? "text-indigo-400" : "text-slate-400"}`}>{String(index + 1).padStart(2, "0")} · {PHASES[phase]}</span>{complete && <span className="text-xs font-bold text-emerald-700">✓</span>}</div>
              <p className={`mt-2 text-xs font-semibold leading-5 ${complete ? "text-emerald-900" : active ? "text-slate-600" : "text-slate-400"}`}>{label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
