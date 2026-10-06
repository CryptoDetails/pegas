const DETERMINISTIC_CONTROLS = [
  "identity",
  "mandate",
  "amount",
  "payee",
  "network",
  "asset",
  "budgets",
  "kill switch",
  "signing permission",
  "evidence requirements",
] as const;

const PRINCIPLES = [
  "Seller cannot expand buyer authority.",
  "Exact payment terms are frozen before signing.",
  "Facilitator success alone is not final proof.",
  "Independent chain evidence must match the approved offer.",
  "The mandate is consumed after the authorized payment.",
  "Paid specialist output is delivered only after confirmed evidence.",
] as const;

export function DesignThesis() {
  return (
    <section className="border-t border-slate-200 py-14 sm:py-18">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--pegas-blue-dark)]">Design thesis</p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            The LLM can reason. It cannot expand its own spending authority.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Pegas treats probabilistic reasoning and financial authority as different layers. The model can interpret, route and analyze. Deterministic controls decide whether a financial side effect is allowed at all.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">LLM</p>
            <p className="mt-3 text-xl font-semibold text-slate-950">Reasoning / routing / specialist analysis</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Flexible interpretation stays inside clearly defined roles.</p>
          </div>
          <div className="border-l border-indigo-200 pl-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">Deterministic system</p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm font-semibold text-slate-800">
              {DETERMINISTIC_CONTROLS.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-x-10 gap-y-0 border-y border-slate-200 sm:grid-cols-2 lg:grid-cols-3">
        {PRINCIPLES.map((principle) => (
          <div key={principle} className="border-b border-slate-200 py-4 text-sm leading-6 text-slate-700 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
            {principle}
          </div>
        ))}
      </div>
    </section>
  );
}
