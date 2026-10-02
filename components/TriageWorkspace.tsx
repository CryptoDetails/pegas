"use client";

// PEGAS_LINT_FIX_01: no synchronous setState in effect

import { useEffect, useState } from "react";
import { AppHeader } from "./AppHeader";
import { ArchitectureCard } from "./ArchitectureCard";
import { BuildGuideTeaser } from "./BuildGuideTeaser";
import { ErrorPanel } from "./ErrorPanel";
import { InferencePath } from "./InferencePath";
import { MessageInput } from "./MessageInput";
import { ProofStrip } from "./ProofStrip";
import { ResultCard } from "./ResultCard";
import { createPreviewResult, getPreviewError, PREVIEW_DELAY_MS } from "@/lib/demo";
import { siteConfig } from "@/lib/site";
import type { TriageResult, UiError } from "@/lib/types";

const defaultMessage =
  "Hi, we are building a wallet and would like to integrate your swap API. Could your team share technical requirements and documentation?";

type ViewState = "ready" | "loading" | "success" | "error";

export function TriageWorkspace() {
  const [message, setMessage] = useState(defaultMessage);
  const [viewState, setViewState] = useState<ViewState>("ready");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [loadingStep, setLoadingStep] = useState(-1);

  const loading = viewState === "loading";

  useEffect(() => {
    if (!loading) return;

    const interval = window.setInterval(() => {
      setLoadingStep((current) => (current >= 4 ? 4 : current + 1));
    }, 300);

    return () => window.clearInterval(interval);
  }, [loading]);

  function handleMessageChange(value: string) {
    setMessage(value);
    if (validationError && value.trim()) setValidationError(null);
  }

  function handleAnalyze() {
    if (!message.trim()) {
      setValidationError("Enter a message to run through the model.");
      return;
    }

    setValidationError(null);
    setError(null);
    setLoadingStep(0);
    setViewState("loading");

    window.setTimeout(() => {
      if (siteConfig.previewMode) {
        setResult(createPreviewResult(message));
        setViewState("success");
        return;
      }

      setError(getPreviewError("MODEL_OFFLINE"));
      setViewState("error");
    }, PREVIEW_DELAY_MS);
  }

  return (
    <div className="min-h-screen">
      <AppHeader active="demo" />

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid items-end gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
                Self-hosted open LLM / portfolio proof
              </span>
              {siteConfig.previewMode ? (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">Infrastructure connection pending</span>
              ) : null}
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">
              Your own open model. On your own cloud GPU.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-xl sm:leading-8">
              Pegas shows the full path from renting a GPU to a working web app, without sending prompts to a hosted third-party LLM API.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">The point of the experiment</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Not another AI form. A visible, measurable proof that one person can deploy an open model, understand the trust boundary, and reproduce the setup.
            </p>
          </div>
        </section>

        <section className="mt-7">
          <ProofStrip />
        </section>

        <section className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.75fr)]">
          <div className="space-y-6">
            <MessageInput
              value={message}
              onChange={handleMessageChange}
              onAnalyze={handleAnalyze}
              loading={loading}
              validationError={validationError}
            />

            {viewState === "loading" ? <InferencePath activeStep={loadingStep} preview={siteConfig.previewMode} /> : null}
            {viewState === "success" && result ? <ResultCard result={result} /> : null}
            {viewState === "error" && error ? <ErrorPanel error={error} /> : null}
          </div>
          <ArchitectureCard />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["1", "You send a message", "A normal browser request starts the flow."],
            ["2", "Pegas routes it server-side", "The browser never receives model credentials."],
            ["3", "Your GPU runs inference", "Ollama sends the prompt to the open model."],
            ["4", "Structured JSON returns", "The app validates and renders the result."],
          ].map(([number, title, copy]) => (
            <div key={number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-blue-600">0{number}</span>
              <h2 className="mt-2 text-sm font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p>
            </div>
          ))}
        </section>

        <BuildGuideTeaser />
      </main>

      <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs leading-5 text-slate-400 sm:px-8">
        Pegas documents the real infrastructure, measured results, actual costs, and known limitations. Preview values are clearly marked until the live proof run exists.
      </footer>
    </div>
  );
}
