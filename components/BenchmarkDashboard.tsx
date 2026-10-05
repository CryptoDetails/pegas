"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "./AppHeader";
import { BenchmarkTable } from "./BenchmarkTable";
import { BuildGuideTeaser } from "./BuildGuideTeaser";
import { MetricCard } from "./MetricCard";
import { categoryCounts } from "@/lib/benchmark";
import type { BenchmarkCase, BenchmarkRunResult, TriageResult, UiError } from "@/lib/types";

type RunState = "idle" | "running" | "complete";

function isTriageResult(value: unknown): value is TriageResult {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<TriageResult>;
  return (
    typeof item.category === "string" &&
    typeof item.priority === "string" &&
    typeof item.summary === "string" &&
    typeof item.nextAction === "string" &&
    typeof item.model === "string" &&
    typeof item.runtime === "string" &&
    typeof item.compute === "string" &&
    typeof item.latencyMs === "number" &&
    item.schemaValid === true
  );
}

function readErrorCode(value: unknown): UiError["code"] | null {
  if (typeof value !== "object" || value === null || !("error" in value)) return null;
  const error = (value as { error?: unknown }).error;
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return code === "MODEL_OFFLINE" || code === "MODEL_STARTING" || code === "MODEL_ERROR" ? code : null;
}

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(p * sorted.length) - 1);
  return sorted[index];
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function percent(value: number, total: number) {
  return total ? `${Math.round((value / total) * 100)}%` : "0%";
}

export function BenchmarkDashboard({ cases }: { cases: BenchmarkCase[] }) {
  const counts = categoryCounts(cases);
  const [runState, setRunState] = useState<RunState>("idle");
  const [completed, setCompleted] = useState(0);
  const [results, setResults] = useState<Record<number, BenchmarkRunResult>>({});

  const metrics = useMemo(() => {
    const items = cases
      .map((item) => results[item.id])
      .filter((item): item is BenchmarkRunResult => Boolean(item));
    const valid = items.filter((item) => item.validOutput);
    const categoryCorrect = cases.filter((item) => results[item.id]?.validOutput && results[item.id]?.category === item.expectedCategory).length;
    const priorityCorrect = cases.filter((item) => results[item.id]?.validOutput && results[item.id]?.priority === item.expectedPriority).length;
    const latencies = items.map((item) => item.latencyMs);
    return {
      categoryCorrect,
      priorityCorrect,
      validCount: valid.length,
      medianLatency: median(latencies),
      p95Latency: percentile(latencies, 0.95),
    };
  }, [cases, results]);

  const failures = useMemo(() => {
    return cases.flatMap((item) => {
      const result = results[item.id];
      if (!result) return [];
      const categoryMismatch = result.validOutput && result.category !== item.expectedCategory;
      const priorityMismatch = result.validOutput && result.priority !== item.expectedPriority;
      if (result.validOutput && !categoryMismatch && !priorityMismatch) return [];

      let mismatch = "Request error";
      if (!result.validOutput && !result.errorCode) mismatch = "Invalid structured output";
      if (categoryMismatch && priorityMismatch) mismatch = "Category + priority mismatch";
      else if (categoryMismatch) mismatch = "Category mismatch";
      else if (priorityMismatch) mismatch = "Priority mismatch";

      return [{ case: item, result, mismatch }];
    }).slice(0, 5);
  }, [cases, results]);

  async function runBenchmark() {
    if (runState === "running") return;
    setRunState("running");
    setCompleted(0);
    setResults({});

    for (let index = 0; index < cases.length; index += 1) {
      const testCase = cases[index];
      const started = performance.now();
      let result: BenchmarkRunResult;

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: testCase.message }),
        });
        const latencyMs = Math.max(0, Math.round(performance.now() - started));
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (response.ok && isTriageResult(payload)) {
          result = {
            caseId: testCase.id,
            category: payload.category,
            priority: payload.priority,
            summary: payload.summary,
            nextAction: payload.nextAction,
            validOutput: true,
            latencyMs,
            errorCode: null,
          };
        } else {
          result = {
            caseId: testCase.id,
            category: null,
            priority: null,
            summary: null,
            nextAction: null,
            validOutput: false,
            latencyMs,
            errorCode: readErrorCode(payload),
          };
        }
      } catch {
        result = {
          caseId: testCase.id,
          category: null,
          priority: null,
          summary: null,
          nextAction: null,
          validOutput: false,
          latencyMs: Math.max(0, Math.round(performance.now() - started)),
          errorCode: "MODEL_OFFLINE",
        };
      }

      setResults((current) => ({ ...current, [testCase.id]: result }));
      setCompleted(index + 1);
    }

    setRunState("complete");
  }

  const hasRun = runState === "complete";

  return (
    <div className="min-h-screen">
      <AppHeader active="benchmark" />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="max-w-3xl">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Legacy single-step experiment</span>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">Measured, not cherry-picked.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              These metrics predate the multi-agent Request Desk and are retained as historical single-step triage and regression evidence.
            </p>
            <p className="mt-3 text-sm text-slate-500">Looking for the current Request Desk evaluation? <a href="/evaluation" className="font-semibold text-blue-700 underline">View the multi-agent workflow evaluation.</a></p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={runBenchmark}
              disabled={runState === "running"}
              className="focus-ring inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
            >
              {runState === "running" ? `Running ${completed} of ${cases.length}` : "Run legacy benchmark"}
            </button>
            <p className="mt-3 text-xs leading-5 text-slate-500">Optional internal-style rerun of the historical single-step path. It is not an evaluation of the current multi-agent workflow.</p>
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Category accuracy" value={hasRun ? percent(metrics.categoryCorrect, cases.length) : "Not run"} note={hasRun ? `${metrics.categoryCorrect} / ${cases.length} correct` : "Correct category / 25 cases"} />
          <MetricCard label="Priority accuracy" value={hasRun ? percent(metrics.priorityCorrect, cases.length) : "Not run"} note={hasRun ? `${metrics.priorityCorrect} / ${cases.length} correct` : "Correct priority / 25 cases"} />
          <MetricCard label="Valid output" value={hasRun ? percent(metrics.validCount, cases.length) : "Not run"} note={hasRun ? `${metrics.validCount} / ${cases.length} schema-valid` : "Schema-valid responses / 25"} />
          <MetricCard label="Median latency" value={hasRun && metrics.medianLatency !== null ? `${metrics.medianLatency} ms` : "Not run"} note="End-to-end request time" />
          <MetricCard label="P95 latency" value={hasRun && metrics.p95Latency !== null ? `${metrics.p95Latency} ms` : "Not run"} note="End-to-end request time" />
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Dataset composition</p>
              <p className="mt-2 text-sm text-slate-300">{cases.length} cases with frozen expected labels, including deliberately ambiguous examples.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {counts.map((item) => (
                <span key={item.category} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
                  <span className="capitalize">{item.category}</span>: <strong className="text-white">{item.count}</strong>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Where the model failed</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Errors are part of the proof</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">This section reports deterministic mismatches and request/output failures from the current run. It does not guess why the model failed.</p>

          {!hasRun ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Waiting for a real benchmark run.</div> : null}
          {hasRun && failures.length === 0 ? <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">No category, priority, structured-output, or request failures in this run.</div> : null}
          {failures.length > 0 ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {failures.map(({ case: testCase, result, mismatch }) => (
                <article key={testCase.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-500">Case #{testCase.id}</p>
                    <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{mismatch}</span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-600">Expected: <strong className="capitalize text-slate-800">{testCase.expectedCategory} / {testCase.expectedPriority}</strong></p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Actual: <strong className="capitalize text-slate-800">{result.validOutput ? `${result.category} / ${result.priority}` : result.errorCode ?? "invalid structured output"}</strong></p>
                  {result.summary ? <p className="mt-3 text-xs leading-5 text-slate-600"><strong>Summary:</strong> {result.summary}</p> : null}
                  {result.nextAction ? <p className="mt-1 text-xs leading-5 text-slate-600"><strong>Next action:</strong> {result.nextAction}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <div className="mt-6"><BenchmarkTable cases={cases} results={results} running={runState === "running"} /></div>
        <BuildGuideTeaser />
      </main>
      <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs leading-5 text-slate-400 sm:px-8">
        Expected labels are frozen before inference and are not changed afterward to improve the score.
      </footer>
    </div>
  );
}
