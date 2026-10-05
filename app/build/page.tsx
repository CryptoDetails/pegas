import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function GuidePage() {
  return <div className="min-h-screen"><AppHeader active="build"/><main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
    <span className="rounded-full border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-3 py-1 text-xs font-bold text-[var(--pegas-blue-dark)]">Guide</span>
    <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">How the Request Desk works</h1>
    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Pegas keeps one self-hosted open model behind a small set of explicit roles and auditable handoffs.</p>
    <section className="mt-8 grid gap-5 md:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 card-shadow"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Runtime path</p><p className="mt-3 font-mono text-sm text-slate-800">Vercel → Modal → Ollama → qwen3:4b</p><p className="mt-3 text-sm leading-6 text-slate-600">All AI roles share the same self-hosted Qwen model. Roles differ by server-side prompts and bounded structured contracts.</p></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 card-shadow"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Request Desk</p><p className="mt-3 font-mono text-sm text-slate-800">Intake → optional Privacy → Department → Review</p><p className="mt-3 text-sm leading-6 text-slate-600">Privacy runs only when needed. Technical, Business and Finance are simulated recipient teams in the current incremental implementation.</p></div>
    </section>
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Historical evaluation</h2><p className="mt-2 text-sm leading-6 text-slate-600">The original benchmark predates the multi-agent Request Desk. It remains available as historical single-step triage and regression evidence.</p><Link href="/benchmark" className="focus-ring mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--pegas-blue)] hover:text-[var(--pegas-blue-dark)]">Legacy benchmark</Link></section>
  </main></div>;
}
