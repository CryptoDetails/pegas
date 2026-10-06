export function AgenticStack() {
  return (
    <section className="border-t border-slate-200 py-14 sm:py-18">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Live stack</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Under the hood</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          One deterministic orchestration layer separates model reasoning from payment authority, then independently verifies what settled on-chain.
        </p>
      </div>

      <div className="mt-10">
        <div className="mx-auto max-w-3xl text-center">
          <FlowNode label="Browser" />
          <FlowLine />
          <FlowNode label="Vercel / Next.js" detail="public app + server orchestration" />
          <FlowLine />
          <FlowNode label="Deterministic Pegas orchestration" detail="identity, mandate, limits, authorization, evidence gates" strong />
        </div>

        <div className="mx-auto mt-6 h-8 w-px bg-slate-300" />
        <div className="mx-auto h-px max-w-4xl bg-slate-300" />
        <div className="mx-auto grid max-w-5xl gap-8 pt-7 lg:grid-cols-2 lg:gap-16">
          <ArchitectureBranch
            eyebrow="AI path"
            title="Reasoning stays probabilistic"
            steps={["Modal", "Ollama", "qwen3:4b", "NVIDIA L4"]}
          />
          <ArchitectureBranch
            eyebrow="Payment path"
            title="Authority stays deterministic"
            steps={["Bounded authority", "x402 V2", "Solana Devnet", "Alchemy evidence"]}
          />
        </div>

        <div className="mx-auto mt-9 max-w-5xl border-t border-dashed border-indigo-200 pt-5">
          <div className="grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-start">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">Upstash Redis</p>
            <p className="text-sm leading-6 text-slate-600">
              Payment-side idempotency, reservations, budgets/concurrency and receipt state. It is attached to the payment path, not used as a general workflow database.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowNode({ label, detail, strong = false }: { label: string; detail?: string; strong?: boolean }) {
  return (
    <div className={`mx-auto w-full rounded-2xl border px-5 py-4 ${strong ? "border-indigo-200 bg-indigo-50/70" : "border-slate-200 bg-white"}`}>
      <p className={`font-semibold ${strong ? "text-indigo-950" : "text-slate-900"}`}>{label}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>}
    </div>
  );
}

function FlowLine() {
  return <div className="mx-auto h-7 w-px bg-slate-300" />;
}

function ArchitectureBranch({ eyebrow, title, steps }: { eyebrow: string; title: string; steps: readonly string[] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
      <div className="mt-5 border-l border-slate-200 pl-5">
        {steps.map((step, index) => (
          <div key={step} className="relative pb-5 last:pb-0">
            <span className="absolute -left-[23px] top-2 h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <p className="text-sm font-semibold text-slate-800">{step}</p>
            {index < steps.length - 1 && <span className="mt-2 block text-xs text-slate-300">↓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
