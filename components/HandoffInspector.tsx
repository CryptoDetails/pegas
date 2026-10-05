"use client";

import { useState } from "react";
import type { Handoff } from "@/lib/workflow/types";

export function HandoffInspector({ handoffs }: { handoffs: Handoff[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!handoffs.length) return null;
  const selected = handoffs.find((item) => item.handoff_id === selectedId) ?? handoffs[handoffs.length - 1];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 card-shadow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Handoff inspector</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Exact context passed between agents</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{handoffs.length} handoff{handoffs.length === 1 ? "" : "s"}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {handoffs.map((handoff) => (
          <button key={handoff.handoff_id} type="button" onClick={() => setSelectedId(handoff.handoff_id)} className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold ${selected.handoff_id === handoff.handoff_id ? "border-[var(--pegas-blue)] bg-[var(--pegas-blue-soft)] text-[var(--pegas-blue-dark)]" : "border-slate-200 bg-white text-slate-600"}`}>
            {agentLabel(handoff.source_agent_id)} → {agentLabel(handoff.target_agent_id)}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-900">{agentLabel(selected.source_agent_id)} → {agentLabel(selected.target_agent_id)}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Why</p>
        <p className="mt-1 text-sm leading-6 text-slate-700">{selected.reason}</p>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">What was passed</p>
        <div className="mt-2 space-y-2">
          {Object.entries(selected.forwarded_context).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] font-bold text-slate-500">{key}</p>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-700">{formatValue(value)}</pre>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">What was withheld</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.withheld_field_names.length ? selected.withheld_field_names.map((field) => <span key={field} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{field}</span>) : <span className="text-xs text-slate-500">Nothing listed</span>}
        </div>
      </div>
    </section>
  );
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function agentLabel(value: string) {
  return value.replace(/_agent$/, "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
