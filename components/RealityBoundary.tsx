const REAL = [
  "Real qwen3:4b calls on Modal and real self-hosted inference",
  "Deterministic role orchestration and bounded mandate/policy checks",
  "Real HTTP 402 challenge and x402 V2 signed test payment",
  "Real Solana Devnet settlement and Alchemy/configured RPC chain evidence",
  "Real Upstash payment-side idempotency/state",
  "Real Legal Advisor result and duplicate-authorization protection",
] as const;

const DEMO = [
  "Fictional company and request",
  "Solana Devnet, test USDC and fixed 0.01 test amount",
  "KYA-lite is a demo identity registry, not bank-grade identity",
  "Not regulatory compliance and not legal advice",
  "Not Lead software; no Lead affiliation or endorsement",
  "No mainnet funds and no browser wallet",
] as const;

export function RealityBoundary() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Demo boundary</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">What is real here?</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Boundary title="REAL" items={REAL} tone="real" />
        <Boundary title="DEMO / BOUNDED" items={DEMO} tone="demo" />
      </div>
    </section>
  );
}

function Boundary({ title, items, tone }: { title: string; items: readonly string[]; tone: "real" | "demo" }) {
  const classes = tone === "real" ? "border-emerald-100 bg-emerald-50/50" : "border-slate-200 bg-slate-50";
  return (
    <div className={`rounded-3xl border p-5 ${classes}`}>
      <p className={`text-xs font-bold tracking-[0.16em] ${tone === "real" ? "text-emerald-700" : "text-slate-500"}`}>{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm leading-6 text-slate-700">
        {items.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-45" /><span>{item}</span></li>)}
      </ul>
    </div>
  );
}
