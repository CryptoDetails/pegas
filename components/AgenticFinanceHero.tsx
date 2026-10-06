const PROOF_CHIPS = [
  "Lead-inspired governance",
  "x402 V2",
  "Solana Devnet",
  "Alchemy evidence",
  "Qwen on Modal",
  "Upstash payment state",
] as const;

export function AgenticFinanceHero({ onRunDemo }: { onRunDemo: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--pegas-border)] bg-white px-6 py-8 card-shadow sm:px-8 sm:py-10 lg:px-10">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-[var(--pegas-blue-dark)]">
            <span className="h-2 w-2 rounded-full bg-[var(--pegas-cyan)]" />
            LIVE AGENTIC FINANCE PROTOTYPE
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-6xl">
            One request. The right team.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Pegas gives an AI workflow narrowly bounded authority to buy specialist expertise. Deterministic policy decides whether one Legal consultation may be paid, x402 settles 0.01 test USDC on Solana Devnet, and independent chain evidence is required before the paid advice reaches Review.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {PROOF_CHIPS.map((chip) => (
              <span key={chip} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <aside className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">The live branch</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Routing Agent → bounded authority → x402 → Legal Advisor → independent Review.
          </p>
          <button type="button" onClick={onRunDemo} className="pegas-primary-button focus-ring mt-5 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(63,94,251,0.18)]">
            Run the Agentic Finance demo
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            This only selects and focuses the paid Legal preset. Payment starts only after you explicitly choose <b>Send a request</b>.
          </p>
        </aside>
      </div>
      <div className="relative mt-7 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
        Inspired by Lead&apos;s September 2026 framework for agentic finance. Pegas is an independent technical prototype exploring how several of those governance ideas can look in a working multi-agent system. <b className="text-slate-700">Independent prototype. Not affiliated with or endorsed by Lead.</b>
      </div>
    </section>
  );
}
