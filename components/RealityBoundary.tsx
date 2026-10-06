const REAL = [
  "Real Qwen calls on Modal",
  "Real x402 402/payment flow",
  "Real Solana Devnet settlement",
  "Real Alchemy chain evidence",
  "Real Upstash payment-side state",
  "Real deterministic authority checks",
  "Real paid Legal Advisor",
  "Real duplicate-payment protection",
] as const;

const DEMO = [
  "Fictional company/request",
  "Test USDC",
  "Solana Devnet",
  "Fixed 0.01 payment",
  "KYA-lite identity registry",
  "Not production identity/compliance infrastructure",
  "No mainnet funds",
  "No browser wallet",
] as const;

export function RealityBoundary() {
  return (
    <section className="border-t border-slate-200 py-14 sm:py-18">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">System boundary</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">What is real. What is deliberately bounded.</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">The demo is transparent about where production behavior is real and where the environment is intentionally constrained.</p>
      </div>

      <div className="mt-9 grid gap-10 border-y border-slate-200 py-8 lg:grid-cols-2 lg:gap-16">
        <Boundary title="Real system behavior" items={REAL} tone="real" />
        <Boundary title="Demo boundary" items={DEMO} tone="demo" />
      </div>
    </section>
  );
}

function Boundary({ title, items, tone }: { title: string; items: readonly string[]; tone: "real" | "demo" }) {
  return (
    <div>
      <p className={`text-xs font-bold uppercase tracking-[0.18em] ${tone === "real" ? "text-emerald-700" : "text-slate-500"}`}>{title}</p>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden="true" className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone === "real" ? "bg-emerald-500" : "bg-slate-400"}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
