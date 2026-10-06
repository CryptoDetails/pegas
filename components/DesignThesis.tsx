const PRINCIPLES = [
  "The LLM reasons about the request; deterministic code owns spending authority.",
  "A seller cannot expand the buyer agent's authority.",
  "Exact payment terms are frozen before signing.",
  "A facilitator success response is not accepted as settlement proof by itself.",
  "Independent chain evidence must match the frozen offer.",
  "The mandate is consumed after the allowed payment.",
  "The specialist result is delivered only after confirmed evidence.",
] as const;

export function DesignThesis() {
  return (
    <section className="rounded-[2rem] border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)]/50 p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--pegas-blue-dark)]">Design thesis</p>
      <blockquote className="mt-3 max-w-4xl text-2xl font-semibold leading-tight tracking-[-0.035em] text-slate-950 sm:text-3xl">
        The interesting problem is not whether an AI can call a payment API. It is whether an agent can be given financial authority that is narrow, inspectable, revocable and provable.
      </blockquote>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRINCIPLES.map((principle) => (
          <div key={principle} className="rounded-2xl border border-white/80 bg-white/80 p-4 text-sm leading-6 text-slate-700">
            {principle}
          </div>
        ))}
      </div>
    </section>
  );
}
