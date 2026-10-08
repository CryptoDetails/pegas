import type { ReactNode } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function GuidePage() {
  return (
    <div className="min-h-screen">
      <AppHeader active="build" />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--pegas-blue-dark)]">Guide / implementation</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
          How the paid Agentic Finance path works
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          This guide stays close to implementation: workflow stages, frozen payment terms, deterministic authorization, independent settlement evidence and the boundaries between workflow state and payment state.
        </p>
        <Link href="/vision" className="focus-ring mt-5 inline-flex rounded-lg text-sm font-semibold text-[var(--pegas-blue-dark)] hover:text-indigo-700">
          Why Pegas uses bounded authority → Vision
        </Link>

        <section className="mt-12 border-t border-slate-200">
          <GuideRow
            number="01"
            title="Request and route"
            mono="Intake → optional Privacy → Routing"
          >
            Intake structures the fictional request. Privacy can reduce forwarded context. Routing selects the destination and may choose the paid Legal branch when the scenario requires specialist review.
          </GuideRow>
          <GuideRow
            number="02"
            title="Check authority before payment"
            mono="Agent Mandate → KYA-lite → AUTH controls"
          >
            The workflow may request a consultation, but deterministic server logic checks the mandate, agent identity, fixed network, asset, payee, amount and budget constraints before any authorization is allowed.
          </GuideRow>
          <GuideRow
            number="03"
            title="Freeze the first valid payment terms"
            mono="First 402 → freeze → authorize → settle"
          >
            The first valid x402 payment challenge defines the terms that are checked and signed. A later response cannot expand or silently change those approved terms.
          </GuideRow>
          <GuideRow
            number="04"
            title="Verify settlement independently"
            mono="x402 V2 → Solana Devnet → configured RPC / Alchemy evidence"
          >
            Facilitator success is not treated as final proof on its own. The configured Solana RPC must observe chain evidence matching the approved offer before the paid Legal result is delivered.
          </GuideRow>
          <GuideRow
            number="05"
            title="Keep payment state narrow"
            mono="Upstash Redis = payment-side state"
          >
            Redis is used for payment-side idempotency, reservations, budgets/concurrency, receipts and reconciliation. It is not used as the general workflow database.
          </GuideRow>
          <GuideRow
            number="06"
            title="Deliver and review"
            mono="Legal Advisor → Reviewer → final result"
          >
            The paid specialist runs only after confirmed payment evidence. The result then returns to Review, while the payment evidence remains inspectable as a separate factual record.
          </GuideRow>
          <GuideRow
            number="07"
            title="Let other agents call Pegas"
            mono="External agent → MCP /api/mcp → same workflow and AUTH controls"
          >
            Pegas is also a remote MCP server. Claude, Cursor or any client that supports remote MCP can call three tools: submit_request (free), request_legal_consultation (0.01 test USDC) and get_payment_evidence (read-only). The caller gets a tool, not authority: it holds no keys and cannot change price, seller, network, asset or count. The mandate records the caller as an unverified external agent, and all external agents share one narrower budget lane.
          </GuideRow>
        </section>

        <section className="mt-12 grid gap-8 border-y border-slate-200 py-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Model runtime</p>
            <p className="mt-3 font-mono text-sm leading-7 text-slate-800">Vercel → Modal → Ollama → qwen3:4b → NVIDIA L4</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Self-hosted model inference is separate from deterministic financial controls.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Payment proof</p>
            <p className="mt-3 font-mono text-sm leading-7 text-slate-800">x402 → Solana Devnet → independent evidence</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">The payment path remains inspectable without turning the model into the authority layer.</p>
          </div>
        </section>

        <section className="border-b border-slate-200 py-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Connect your own agent</p>
          <p className="mt-3 break-all font-mono text-sm leading-7 text-slate-800">https://pegas-rouge.vercel.app/api/mcp</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            In Claude: Customize → Connectors → Add custom connector, paste the URL, choose no sign-in. Then ask Claude to use the Pegas tools. You can also try it without any setup: on the Demo page, switch to &quot;AI agent via MCP&quot;.
          </p>
          <Link href="/" className="focus-ring mt-4 inline-flex rounded-lg text-sm font-semibold text-[var(--pegas-blue-dark)] hover:text-indigo-700">
            Try the MCP agent mode on the Demo →
          </Link>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Evaluation</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            The 12-case workflow evaluation remains standard mode and cannot spend. The older benchmark remains historical single-step evidence.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/evaluation" className="focus-ring inline-flex rounded-xl border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-4 py-2 text-sm font-semibold text-[var(--pegas-blue-dark)]">Current workflow evaluation</Link>
            <Link href="/benchmark" className="focus-ring inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Legacy benchmark</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function GuideRow({ number, title, mono, children }: { number: string; title: string; mono: string; children: ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-slate-200 py-7 last:border-b-0 md:grid-cols-[56px_minmax(0,0.75fr)_minmax(0,1.25fr)] md:gap-8">
      <span className="text-xs font-bold tracking-[0.16em] text-indigo-400">{number}</span>
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 font-mono text-xs leading-5 text-slate-500">{mono}</p>
      </div>
      <p className="text-sm leading-6 text-slate-600">{children}</p>
    </div>
  );
}
