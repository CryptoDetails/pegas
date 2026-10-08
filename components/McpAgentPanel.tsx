"use client";

import { useEffect, useRef, useState } from "react";
import type { McpTraffic } from "@/lib/mcp/browser-client";

export type TranscriptEntry = McpTraffic & { id: number };
export type DelegationLink = { label: string; identity?: string };
export type Delegation = { chain: DelegationLink[]; note: string | null };

export function McpAgentPanel({ entries, delegation, running }: { entries: TranscriptEntry[]; delegation: Delegation | null; running: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [entries.length]);

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 card-shadow" aria-label="MCP transcript">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Agent ↔ Pegas · MCP transcript</h2>
          <p className="mt-1 text-xs text-slate-500">Real JSON-RPC to /api/mcp</p>
        </div>
        {running && <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--pegas-blue)]" aria-hidden="true" />}
      </div>

      <div ref={scrollRef} className="mt-4 max-h-[420px] overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">Send a request to watch the agent discover Pegas tools and call them.</p>
        ) : (
          <ol className="space-y-1">
            {entries.map((entry, index) => {
              const progress = entry.method === "progress";
              const groupedAbove = progress && entries[index - 1]?.method === "progress";
              const expanded = open === entry.id;
              return (
                <li key={entry.id} className={groupedAbove ? "" : "pt-1"}>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : entry.id)}
                    aria-expanded={expanded}
                    className={`focus-ring w-full rounded-xl px-3 text-left transition ${progress ? "border-l-2 border-indigo-100 bg-transparent py-1 hover:bg-slate-50" : `py-2 hover:bg-slate-100 ${entry.kind === "error" ? "bg-rose-50" : "bg-slate-50"}`}`}
                  >
                    {!progress && (
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span className={`font-bold ${entry.direction === "out" ? "text-indigo-700" : "text-slate-700"}`}>{entry.direction === "out" ? "Agent → Pegas" : "Pegas → Agent"}</span>
                        <span className="break-all font-mono text-slate-500">{entry.method}</span>
                      </span>
                    )}
                    <span className={`block break-words ${progress ? "text-[11px] leading-5 text-slate-500" : `mt-0.5 text-xs leading-5 ${entry.kind === "error" ? "text-rose-700" : "text-slate-800"}`}`}>
                      {progress && <span className="mr-1.5 font-mono text-slate-400">progress</span>}
                      {entry.summary}
                    </span>
                  </button>
                  {expanded && (
                    <pre className="mt-1 max-h-60 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[10.5px] leading-4 text-slate-100">{entry.raw}</pre>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {delegation && (
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-xs leading-5 text-indigo-900">
          {delegation.chain.map((link, index) => (
            <div key={`${link.label}-${index}`} style={{ paddingLeft: `${index * 0.9}rem` }}>
              {index > 0 && <span className="mr-1 text-indigo-400">→</span>}
              <b>{link.label}</b>{link.identity && <span className="text-indigo-700"> ({link.identity})</span>}
            </div>
          ))}
          {delegation.note && <p className="mt-2 text-indigo-800">{delegation.note}</p>}
        </div>
      )}
    </section>
  );
}
