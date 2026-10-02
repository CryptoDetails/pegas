import type { Priority, TriageResult } from "@/lib/types";

function priorityStyle(priority: Priority) {
  if (priority === "high") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "medium") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-green-200 bg-green-50 text-green-700";
}

function proofValue(value: string, note?: string) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{value}</p>
      {note ? <p className="mt-0.5 text-[11px] text-slate-400">{note}</p> : null}
    </div>
  );
}

export function ResultCard({ result }: { result: TriageResult }) {
  return (
    <section className="card-shadow overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Structured result</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">The model made a decision</h2>
          </div>
          {result.isPreview ? (
            <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">UI preview data</span>
          ) : (
            <span className="w-fit rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Live inference</span>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Category</p>
            <p className="mt-2 text-lg font-semibold capitalize text-slate-950">{result.category}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Priority</p>
            <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold capitalize ${priorityStyle(result.priority)}`}>
              {result.priority}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Summary</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{result.summary}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-500">Recommended next action</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-800">{result.nextAction}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-950 px-5 py-6 text-white sm:px-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">This inference</p>
            <h3 className="mt-1 text-lg font-semibold">Proof, not just output</h3>
          </div>
          <p className="max-w-md text-xs leading-5 text-slate-400">These fields show where the answer came from and what was actually measured.</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">Model</p><div className="mt-2">{proofValue(result.model)}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">Compute</p><div className="mt-2">{proofValue(result.compute)}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">Runtime</p><div className="mt-2">{proofValue(result.runtime)}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">Latency</p><div className="mt-2">{proofValue(result.latencyMs === null ? "Not measured" : `${result.latencyMs} ms`)}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">Structured output</p><div className="mt-2">{proofValue(result.schemaValid === null ? "Not measured" : result.schemaValid ? "Schema valid" : "Invalid")}</div></div>
          <div className="rounded-2xl border border-green-900/70 bg-green-950/30 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-green-500">Hosted LLM API</p><div className="mt-2">{proofValue("None", "not in target inference path")}</div></div>
        </div>
      </div>
    </section>
  );
}
