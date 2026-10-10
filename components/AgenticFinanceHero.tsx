const PROOF_SIGNALS = [
  "x402 V2",
  "Solana Devnet",
  "Lead-inspired governance",
  "Alchemy evidence",
  "Qwen on Modal",
] as const;

export function AgenticFinanceHero({ onRunDemo, onRunAgentDemo }: { onRunDemo: () => void; onRunAgentDemo: () => void }) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 pb-10 pt-3 sm:pb-12 sm:pt-5 lg:pb-14">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-indigo-100/70 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--pegas-blue-dark)]">Live Agentic Finance demo</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
            One request. The right team.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Pegas gives an AI workflow narrowly bounded authority to buy specialist expertise, settle one machine-to-machine payment and prove what happened before the result reaches Review.
          </p>
          <p className="mt-5 max-w-3xl border-l-2 border-indigo-300 pl-4 text-sm leading-6 text-slate-700 sm:text-base">
            Inspired by Lead&apos;s September 2026 framework for agentic finance, Pegas explores how agent identity, delegated authority, transaction limits and auditable payments can work in a live multi-agent system.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
            {PROOF_SIGNALS.map((signal) => (
              <span key={signal} className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                {signal}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 px-2.5 py-0.5 text-[var(--pegas-blue-dark)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--pegas-blue)]" />
              MCP server
            </span>
          </div>
        </div>

        <aside className="border-l border-slate-200 pl-0 lg:pl-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">What this run demonstrates</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Request → agent workflow → bounded payment → Legal Advisor → Review → verifiable evidence.
          </p>
          <button
            type="button"
            onClick={onRunDemo}
            className="pegas-primary-button focus-ring mt-5 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(63,94,251,0.18)]"
          >
            Run the Agentic Finance demo
          </button>
          <button
            type="button"
            onClick={onRunAgentDemo}
            className="focus-ring mt-2.5 inline-flex w-full items-center justify-center rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-[var(--pegas-blue-dark)] transition hover:border-[var(--pegas-blue)] hover:bg-indigo-50/60"
          >
            Try it as an AI agent (MCP)
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Selects the paid Legal scenario and focuses the workspace. Nothing is submitted or paid until you choose Send. The second button lets a built-in AI agent call Pegas over MCP instead of the web form.
          </p>
        </aside>
      </div>
    </section>
  );
}
