"use client";

import { useMemo, useState } from "react";
import type { BenchmarkCase, Category } from "@/lib/types";
import { categoryOrder } from "@/lib/benchmark";

export function BenchmarkTable({ cases }: { cases: BenchmarkCase[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cases.filter((item) => {
      const matchesQuery = !normalized || item.message.toLowerCase().includes(normalized);
      const matchesCategory = category === "all" || item.expectedCategory === category;
      return matchesQuery && matchesCategory;
    });
  }, [cases, query, category]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Fixed dataset</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">25 labeled test cases</h2>
            <p className="mt-1 text-sm text-slate-500">Expected labels are frozen before the model is evaluated.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="benchmark-search">Search benchmark cases</label>
            <input
              id="benchmark-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search messages..."
              className="focus-ring min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-400"
            />
            <label className="sr-only" htmlFor="benchmark-category">Filter by category</label>
            <select
              id="benchmark-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category | "all")}
              className="focus-ring min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700"
            >
              <option value="all">All categories</option>
              {categoryOrder.map((item) => (
                <option value={item} key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-400">
            <tr>
              <th className="px-5 py-3 font-semibold">Message</th>
              <th className="px-5 py-3 font-semibold">Expected</th>
              <th className="px-5 py-3 font-semibold">Model</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <tr key={item.id} className="align-top hover:bg-slate-50/70">
                <td className="max-w-xl px-5 py-4 leading-6 text-slate-700">
                  <span className="mr-2 text-xs font-semibold text-slate-400">#{item.id}</span>
                  {item.message}
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-1">
                    <span className="block font-semibold capitalize text-slate-800">{item.expectedCategory}</span>
                    <span className="block text-xs capitalize text-slate-500">{item.expectedPriority} priority</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-400">Pending</td>
                <td className="px-5 py-4">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">Not run</span>
                </td>
                <td className="px-5 py-4 text-slate-400">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
        Showing {filtered.length} of {cases.length} cases.
      </div>
    </section>
  );
}
