"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { SITE_ORIGIN } from "@/lib/site";

const STEPS = [
  "In Claude, open Customize → Connectors → Add custom connector.",
  "Paste the URL and choose no sign-in.",
  "In a new chat, ask: “Use Pegas to review this NDA clause…”",
];
const GETS = [
  { name: "submit_request", text: "free routing by Pegas agents" },
  { name: "request_legal_consultation", text: "one Legal consultation for 0.01 test USDC" },
  { name: "get_payment_evidence", text: "read-only proof of payment" },
];
const NEVER = ["payment keys or signing", "control over price, seller, network or token", "more than one payment per mandate"];

const noopSubscribe = () => () => {};

export function ConnectAgentSection() {
  const endpoint = useSyncExternalStore(noopSubscribe, () => `${window.location.origin}/api/mcp`, () => `${SITE_ORIGIN}/api/mcp`);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may be unavailable */ }
  }

  return (
    <section aria-labelledby="connect-agent-heading" className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 card-shadow sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--pegas-blue-dark)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
            MCP server · Live
          </p>
          <h2 id="connect-agent-heading" className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Connect your AI agent to Pegas</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            Pegas is a remote MCP server. Add it to Claude, Cursor or any MCP client, and your assistant can route requests and buy a Legal consultation from Pegas, under Pegas&apos; own bounded mandate.
          </p>

          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 pl-4">
            <code className="min-w-0 flex-1 break-all font-mono text-[13px] leading-5 text-slate-800">{endpoint}</code>
            <button
              type="button"
              onClick={copy}
              aria-live="polite"
              className="focus-ring shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-[var(--pegas-blue)] hover:text-[var(--pegas-blue-dark)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <ol className="mt-5 space-y-3">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--pegas-blue-soft)] text-[11px] font-bold text-[var(--pegas-blue-dark)]">{index + 1}</span>
                <span className="min-w-0">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-5 text-slate-500">In Claude you get a live Pegas receipt card right in the chat.</p>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
            <Link href="/build" className="focus-ring rounded-lg text-[var(--pegas-blue-dark)] hover:text-indigo-700">How it works → Guide</Link>
            <Link href="/blog/pegas-mcp-server-tool-not-authority" className="focus-ring rounded-lg text-[var(--pegas-blue-dark)] hover:text-indigo-700">Read the story → Blog</Link>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">What your agent gets</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">Your agent gets 3 tools</p>
          <ul className="mt-3 space-y-2.5">
            {GETS.map((tool) => (
              <li key={tool.name} className="flex gap-2.5 text-sm leading-6 text-slate-700">
                <CheckIcon />
                <span className="min-w-0"><code className="break-all font-mono text-[12.5px] font-semibold text-slate-900">{tool.name}</code> — {tool.text}</span>
              </li>
            ))}
          </ul>

          <div className="my-5 border-t border-dashed border-slate-300" />

          <p className="text-sm font-semibold text-slate-900">Your agent never gets</p>
          <ul className="mt-3 space-y-2.5">
            {NEVER.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-6 text-slate-500">
                <LockIcon />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 border-t border-slate-200 pt-4 text-base font-semibold tracking-[-0.01em] text-slate-950">A tool, not authority.</p>
        </div>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0 text-[var(--pegas-blue)]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M5.4 8.2l1.8 1.8 3.4-3.8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
    </svg>
  );
}
