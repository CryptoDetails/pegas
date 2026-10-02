"use client";

import { AppHeader } from "./AppHeader";
import { BenchmarkTable } from "./BenchmarkTable";
import { BuildGuideTeaser } from "./BuildGuideTeaser";
import { MetricCard } from "./MetricCard";
import { categoryCounts } from "@/lib/benchmark";
import type { BenchmarkCase } from "@/lib/types";

export function BenchmarkDashboard({ cases }: { cases: BenchmarkCase[] }) {
  const counts = categoryCounts(cases);

  return (
    <div className="min-h-screen">
      <AppHeader active="benchmark" />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="max-w-3xl">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Measured evidence</span>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">Measured, not cherry-picked.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              A fixed 25-case dataset shows whether the model is actually useful for the task, how fast it responds, and where it fails.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            The benchmark has not been executed yet. Scores stay blank until Qwen3 4B runs on the real GPU endpoint.
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Category accuracy" value="Not run" note="Correct category / 25 cases" />
          <MetricCard label="Priority accuracy" value="Not run" note="Correct priority / 25 cases" />
          <MetricCard label="Valid output" value="Not run" note="Schema-valid responses / 25" />
          <MetricCard label="Median latency" value="Not run" note="Measured on the real endpoint" />
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
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            After the real run, this section will show 3-5 misses with the expected label, model label, likely cause, and whether the problem belongs to the model, prompt, or taxonomy.
          </p>
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Waiting for the first real benchmark run.</div>
        </section>

        <div className="mt-6"><BenchmarkTable cases={cases} /></div>
        <BuildGuideTeaser />
      </main>
      <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs leading-5 text-slate-400 sm:px-8">
        Expected labels are frozen before inference and are not changed afterward to improve the score.
      </footer>
    </div>
  );
}
