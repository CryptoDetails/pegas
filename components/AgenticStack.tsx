const STACK = [
  ["VERCEL", "Public Next.js app plus deterministic workflow and payment orchestration."],
  ["MODAL", "Self-hosted inference runtime: Ollama + qwen3:4b on NVIDIA L4."],
  ["X402", "Machine-native payment challenge, authorization and settlement. V2 · exact · upfront."],
  ["SOLANA", "Real Devnet settlement using test USDC."],
  ["ALCHEMY", "Independent Solana RPC evidence used to verify the transaction on-chain. It does not sign or settle the payment."],
  ["UPSTASH REDIS", "Payment-only state for idempotency, reservations, budgets/concurrency and receipts. Not the workflow database."],
] as const;

export function AgenticStack() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Live stack</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">Under the hood</h2>
      <div className="mt-6 rounded-3xl border border-indigo-100 bg-indigo-50/35 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Path title="AI branch" items={["Browser", "Vercel / Next.js", "deterministic Pegas orchestration", "Modal", "Ollama", "qwen3:4b", "NVIDIA L4"]} />
          <Path title="Payment branch" items={["Browser", "Vercel / Next.js", "deterministic Pegas orchestration", "bounded authority", "x402", "Solana Devnet", "Alchemy evidence"]} />
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-indigo-200 bg-white/80 px-4 py-3 text-xs font-semibold text-indigo-800">
          Upstash Redis attaches only to payment-side state. It is not a general persistent workflow engine.
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STACK.map(([name, description]) => (
          <div key={name} className="rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-bold tracking-[0.14em] text-[var(--pegas-blue-dark)]">{name}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Path({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="rounded-2xl border border-white bg-white/80 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500">{title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
        {items.map((item, index) => (
          <span key={`${title}-${item}`} className="contents">
            {index > 0 && <span className="text-slate-300">→</span>}
            <span className="rounded-lg bg-slate-50 px-2.5 py-1.5">{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
