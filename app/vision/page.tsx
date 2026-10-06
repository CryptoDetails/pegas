import Link from "next/link";
import { AgenticStack } from "@/components/AgenticStack";
import { AppHeader } from "@/components/AppHeader";
import { DesignThesis } from "@/components/DesignThesis";
import { FrameworkToPrototype } from "@/components/FrameworkToPrototype";
import { RealityBoundary } from "@/components/RealityBoundary";

const LEAD_QUESTIONS = [
  "Who is acting?",
  "On whose authority?",
  "Within what limits?",
  "Against which counterparties?",
  "With what revocation path?",
  "With what audit trail?",
] as const;

export default function VisionPage() {
  return (
    <div className="min-h-screen">
      <AppHeader active="vision" />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="relative overflow-hidden pb-14 pt-2 sm:pb-18">
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-violet-100/70 blur-3xl" />
          <div className="relative max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--pegas-blue-dark)]">Agentic Finance / design vision</p>
            <h1 className="mt-5 max-w-5xl text-5xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
              An agent with a wallet is easy. An agent with governed authority is the interesting problem.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Pegas explores a simple idea: once an AI agent can create financial side effects, prompts are no longer enough. Identity, authority, limits and evidence have to become first-class parts of the system.
            </p>
          </div>
        </section>

        <section className="grid gap-10 border-y border-slate-200 py-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 sm:py-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">The framework that changed the design</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Lead → from agent payments to governed agentic finance
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Lead&apos;s September 2026 <i>Leading into the AI Revolution</i> paper frames the important problem around governance questions that sit above a payment API. Pegas uses a subset of those ideas as the conceptual starting point for the prototype.
            </p>
          </div>
          <div>
            <div className="grid gap-0 border-t border-slate-200 sm:grid-cols-2">
              {LEAD_QUESTIONS.map((question) => (
                <div key={question} className="border-b border-slate-200 py-4 pr-6 text-lg font-semibold leading-7 text-slate-900 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(even)]:pl-6">
                  {question}
                </div>
              ))}
            </div>
            <p className="mt-6 text-base leading-7 text-slate-700">
              Pegas takes those governance questions and explores what they can look like in working software today: a known agent identity, recorded delegation, hard transaction limits, a revocation path and evidence that can be reconstructed after the fact.
            </p>
          </div>
        </section>

        <FrameworkToPrototype />
        <DesignThesis />
        <AgenticStack />
        <RealityBoundary />

        <section className="border-t border-slate-200 py-12 sm:py-14">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Development story</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Read how we built it.</h2>
            </div>
            <Link href="/blog" className="focus-ring inline-flex rounded-lg text-base font-semibold text-[var(--pegas-blue-dark)] hover:text-indigo-700">
              Read how we built it →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
