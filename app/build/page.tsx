import type { ReactNode } from "react";
import Link from "next/link";
import { AgenticStack } from "@/components/AgenticStack";
import { AppHeader } from "@/components/AppHeader";
import { DesignThesis } from "@/components/DesignThesis";
import { FrameworkToPrototype } from "@/components/FrameworkToPrototype";
import { RealityBoundary } from "@/components/RealityBoundary";

export default function GuidePage() {
  return (
    <div className="min-h-screen">
      <AppHeader active="build" />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <span className="rounded-full border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-3 py-1 text-xs font-bold text-[var(--pegas-blue-dark)]">Architecture & product rationale</span>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">How Pegas turns bounded agent authority into a verifiable paid workflow</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">Pegas keeps self-hosted AI reasoning behind explicit roles, while deterministic server code owns financial authority. The paid Legal path demonstrates how one narrowly scoped authorization can move from mandate to x402 settlement, independent chain evidence and specialist delivery.</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Inspired by Lead&apos;s September 2026 framework for agentic finance. Independent prototype. Not affiliated with or endorsed by Lead.</p>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Card title="Request Desk" mono="Intake → optional Privacy → Routing → optional paid Legal Advisor → Reviewer">Technical, Business, Finance and Legal are destinations in the demo workflow. The paid Legal branch adds a specialist only when the route requires it.</Card>
          <Card title="Deterministic authority" mono="Agent Mandate → KYA-lite → AUTH-01…10 → x402">The LLM may request a consultation. It cannot choose the wallet authority, expand the budget, change the frozen asset/network/payee/amount or bypass deterministic policy.</Card>
          <Card title="Frozen-first-402 invariant" mono="First 402 terms → freeze → authorize → settle">The first valid payment challenge defines the terms that are checked against authority and signed. Payment terms are not allowed to drift after authorization.</Card>
          <Card title="Independent evidence" mono="x402 exact/upfront → Solana Devnet → RPC evidence">A payment is not trusted merely because a facilitator reports success. The configured Solana RPC must independently observe a matching transfer before delivery proceeds.</Card>
          <Card title="Payment-only persistence" mono="Upstash Redis ≠ workflow database">Redis is limited to payment-side idempotency, reservations, budgets/concurrency, receipts/reconciliation and safe already-paid operation reuse where applicable.</Card>
          <Card title="Self-hosted model runtime" mono="Vercel → Modal → Ollama → qwen3:4b → NVIDIA L4">The public Next.js app runs on Vercel. AI inference runs on Modal with Ollama and qwen3:4b on NVIDIA L4.</Card>
        </section>

        <div className="mt-8 space-y-8">
          <DesignThesis />
          <FrameworkToPrototype />
          <AgenticStack />
          <RealityBoundary />
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-950">Operational invariants</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Invariant>LLM reasoning does not own spending authority.</Invariant>
            <Invariant>Effective authority is the intersection of policy, mandate, identity, quote and budget controls.</Invariant>
            <Invariant>One mandate allows at most one Legal payment authorization.</Invariant>
            <Invariant>Payment state and consultation state remain separate.</Invariant>
            <Invariant>Successful settlement evidence remains meaningful even if a later Legal model step fails.</Invariant>
            <Invariant>No browser wallet, no mainnet funds and no secret payment material is exposed.</Invariant>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-950">Evaluation</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">The 12-case workflow evaluation remains standard mode and cannot spend. The older benchmark remains historical single-step evidence.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/evaluation" className="focus-ring inline-flex rounded-xl border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-4 py-2 text-sm font-semibold text-[var(--pegas-blue-dark)]">Current workflow evaluation</Link>
            <Link href="/benchmark" className="focus-ring inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Legacy benchmark</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ title, mono, children }: { title: string; mono: string; children: ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 card-shadow"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p><p className="mt-3 font-mono text-sm text-slate-800">{mono}</p><p className="mt-3 text-sm leading-6 text-slate-600">{children}</p></div>;
}

function Invariant({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{children}</div>;
}
