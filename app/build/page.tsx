import type { ReactNode } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function GuidePage() {
  return <div className="min-h-screen"><AppHeader active="build"/><main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
    <span className="rounded-full border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-3 py-1 text-xs font-bold text-[var(--pegas-blue-dark)]">Guide</span>
    <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">How the Request Desk works</h1>
    <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">Pegas keeps one self-hosted open model behind explicit roles and auditable handoffs. The optional paid Legal path adds deterministic financial authority outside the LLM.</p>
    <section className="mt-8 grid gap-5 md:grid-cols-2">
      <Card title="Runtime path" mono="Vercel → Modal → Ollama → qwen3:4b">All AI roles share the same self-hosted Qwen model. Roles differ by server-side prompts and bounded structured contracts.</Card>
      <Card title="Request Desk" mono="Intake → optional Privacy → Routing → optional paid Legal Advisor → Reviewer">Technical, Business, Finance and Legal are static destinations. Legal Advisor is the only additional specialist runtime role and exists only in paid mode.</Card>
      <Card title="Agent authority" mono="Agent Mandate → KYA-lite → AUTH-01…10 → x402">The LLM may request a consultation, but it cannot choose price, payee, asset, network, budget or signing authority. Effective authority is an intersection of deterministic server controls.</Card>
      <Card title="Settlement evidence" mono="HTTP 402 → x402 exact/upfront → Solana Devnet → RPC evidence">The paid path uses fixed 0.01 test USDC. A successful signature is not treated as settlement, and settlement is not treated as confirmed until independent chain evidence matches the frozen offer.</Card>
    </section>
    <section className="mt-6 rounded-3xl border border-indigo-100 bg-indigo-50/40 p-6"><h2 className="text-xl font-semibold text-slate-950">KYA-lite | Demo identity registry</h2><p className="mt-2 text-sm leading-6 text-slate-600">Pegas binds the routing/buyer agent and Legal Advisor to stable demo identities and configured public wallets. This is a small demo registry, not bank-grade KYA, certification, or a general identity platform.</p></section>
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Design inspiration</h2><p className="mt-2 text-sm leading-6 text-slate-600">Design inspiration: bounded agent authority and KYA concepts from Lead&apos;s “Leading into the AI Revolution” (September 2026). Conceptual inspiration only. Pegas is not affiliated with or endorsed by Lead.</p></section>
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Evaluation</h2><p className="mt-2 text-sm leading-6 text-slate-600">The 12-case workflow evaluation remains standard mode and cannot spend. The older benchmark remains historical single-step evidence.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/evaluation" className="focus-ring inline-flex rounded-xl border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-4 py-2 text-sm font-semibold text-[var(--pegas-blue-dark)]">Current workflow evaluation</Link><Link href="/benchmark" className="focus-ring inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Legacy benchmark</Link></div></section>
  </main></div>;
}
function Card({title,mono,children}:{title:string;mono:string;children:ReactNode}){return <div className="rounded-3xl border border-slate-200 bg-white p-6 card-shadow"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p><p className="mt-3 font-mono text-sm text-slate-800">{mono}</p><p className="mt-3 text-sm leading-6 text-slate-600">{children}</p></div>}
