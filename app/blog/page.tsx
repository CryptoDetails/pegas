import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Pegas Blog | Building a self-hosted open LLM",
  description: "Field notes from building Pegas: self-hosted Qwen3 4B, serverless GPU lifecycle, multi-agent routing, privacy review, and inspectable handoffs.",
};

const articles = [
  {
    href: "/blog/open-source-llm-cloud-gpu",
    label: "Article 1",
    title: "How We Ran an Open-Source LLM on a Cloud GPU",
    subtitle: "RunPod + Ollama + Qwen3 4B: a practical proof, not a benchmark",
  },
  {
    href: "/blog/when-the-demo-worked-and-then-broke",
    label: "Article 2",
    title: "When the Demo Worked - and Then Everything Broke",
    subtitle: "What persistent storage, cloud networking, and GPU detection taught us",
  },
  {
    href: "/blog/making-self-hosted-llm-easy-to-restart",
    label: "Article 3",
    title: "Making a Self-Hosted LLM Easy to Restart Was Harder Than Running It",
    subtitle: "What RunPod storage, GPU availability, persistent models, HTTP proxying, and cold starts taught us about practical operation",
  },
  {
    href: "/blog/why-gpu-hosting-costs-so-much",
    label: "Article 4",
    title: "Why Does Running an Open Model Cost So Much?",
    subtitle: "What we learned about GPU economics, CPU hosting, hosted inference, and why RunPod was a reasonable first choice for Pegas — even though it was not the final infrastructure answer.",
  },
  {
    href: "/blog/pegas-serverless-gpu-modal-scale-to-zero",
    label: "Article 5",
    title: "The Day Pegas Stopped Needing a GPU Babysitter",
    subtitle: "How request-driven serverless inference, scale-to-zero, and a stable Modal endpoint changed the operating model of Pegas.",
  },
  {
    href: "/blog/pegas-multi-agent-request-desk",
    label: "Article 6",
    title: "From One Model Call to a Multi-Agent System: How Pegas Learned to Route Work",
    subtitle: "How Pegas became a visible Request Desk with specialized agents, conditional privacy review, bounded correction loops, and inspectable handoffs.",
  },
  {
    href: "/blog/pegas-agentic-finance-x402-solana",
    label: "Article 7",
    title: "From AI Workflow to Agentic Finance: How Pegas Learned to Pay for Expertise",
    subtitle: "How bounded authority, x402 on Solana Devnet, Alchemy evidence, Upstash payment state, and ideas from Lead's agentic finance framework became one working Pegas flow.",
  },
  {
    href: "/blog/pegas-mcp-server-tool-not-authority",
    label: "Article 8 · Latest",
    title: "Pegas Became an MCP Server: Other Agents Get a Tool, Not Authority",
    subtitle: "How Pegas opened itself to external AI agents through the Model Context Protocol, and why the caller gets a tool but never payment authority.",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      <AppHeader active="blog" />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="max-w-4xl">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Field notes · October 2026</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">How the proof was built.</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Practical field notes from building, breaking, operating, and evolving a self-hosted open-model system.
          </p>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          {articles.map((article) => (
            <Link key={article.href} href={article.href} className="focus-ring group flex min-h-72 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{article.label}</span>
                <span className="text-xs text-slate-400">October 2026</span>
              </div>
              <h2 className="mt-7 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{article.title}</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">{article.subtitle}</p>
              <span className="mt-auto pt-8 text-sm font-semibold text-blue-600 transition group-hover:text-blue-800">Read article →</span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
