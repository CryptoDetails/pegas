"use client";

import { useState } from "react";
import type { Priority, ProofResponse, TriageResult } from "@/lib/types";

const REPOSITORY_URL = "https://github.com/cryptoDetails/pegas";
const SOURCE_FILES = [
  ["Analyze route", "app/api/analyze/route.ts"],
  ["Ollama adapter", "lib/ollama.ts"],
  ["Classification prompt", "lib/prompt.ts"],
  ["Output schema", "lib/schema.ts"],
] as const;

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

function formatBytes(value?: number) {
  if (value === undefined) return null;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(unit >= 3 ? 2 : 0)} ${units[unit]}`;
}

function shortSha(value: string) {
  return value.slice(0, 7);
}

export function ResultCard({ result }: { result: TriageResult }) {
  const [proofOpen, setProofOpen] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);
  const [proof, setProof] = useState<ProofResponse | null>(null);
  const [proofError, setProofError] = useState(false);

  async function verifyInference() {
    setProofOpen(true);
    setProofLoading(true);
    setProofError(false);
    try {
      const response = await fetch("/api/proof", { cache: "no-store" });
      if (!response.ok) throw new Error("proof request failed");
      setProof((await response.json()) as ProofResponse);
    } catch {
      setProofError(true);
      setProof(null);
    } finally {
      setProofLoading(false);
    }
  }

  const sourceRef = proof?.deploymentCommitSha ?? "main";

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">This inference</p>
            <h3 className="mt-1 text-lg font-semibold">Proof, not just output</h3>
          </div>
          {!result.isPreview ? (
            <div className="w-full sm:w-auto sm:text-right">
              <button
                type="button"
                onClick={verifyInference}
                disabled={proofLoading}
                className="focus-ring inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              >
                {proofLoading ? "Checking runtime..." : "Verify this inference"}
              </button>
              <p className="mt-1.5 text-[11px] font-medium text-blue-200">See live runtime evidence</p>
            </div>
          ) : null}
        </div>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">Per-request latency is measured. Compute is deployment configuration; the verification panel shows only runtime evidence the server can obtain.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">Model</p><div className="mt-2">{proofValue(result.model)}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">Configured compute</p><div className="mt-2">{proofValue(result.compute, "deployment environment label")}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">Runtime</p><div className="mt-2">{proofValue(result.runtime)}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">Latency</p><div className="mt-2">{proofValue(result.latencyMs === null ? "Not measured" : `${result.latencyMs} ms`, "this request only")}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">Structured output</p><div className="mt-2">{proofValue(result.schemaValid === null ? "Not measured" : result.schemaValid ? "Schema valid" : "Invalid")}</div></div>
          <div className="rounded-2xl border border-green-900/70 bg-green-950/30 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-green-500">Hosted LLM API</p><div className="mt-2">{proofValue("None", "not in target inference path")}</div></div>
        </div>

        {proofOpen ? (
          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-300">Runtime + source transparency</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">This does not cryptographically attest the hardware. It exposes the diagnostics the running server can actually retrieve.</p>
              </div>
              <button type="button" onClick={() => setProofOpen(false)} className="focus-ring rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-white">Close</button>
            </div>

            {proofLoading ? <p className="mt-4 text-sm text-slate-300">Querying Ollama diagnostics...</p> : null}
            {proofError ? <p className="mt-4 text-sm text-amber-300">Runtime proof is unavailable right now. No diagnostic values were invented.</p> : null}

            {proof ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Model endpoint</p><p className="mt-1 text-sm font-semibold">{proof.modelEndpointReachable ? "Reachable" : "Unavailable"}</p></div>
                  {proof.ollamaVersion ? <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Ollama version</p><p className="mt-1 text-sm font-semibold">{proof.ollamaVersion}</p></div> : null}
                  {proof.configuredModel ? <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Configured model</p><p className="mt-1 text-sm font-semibold">{proof.configuredModel}</p></div> : null}
                  {proof.configuredModelPresent !== undefined ? <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Model in Ollama tags</p><p className="mt-1 text-sm font-semibold">{proof.configuredModelPresent ? "Present" : "Not reported"}</p></div> : null}
                  {proof.loadedModel ? <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Loaded model</p><p className="mt-1 text-sm font-semibold">{proof.loadedModel.name}</p>{formatBytes(proof.loadedModel.sizeVramBytes) ? <p className="mt-1 text-xs text-slate-400">VRAM reported: {formatBytes(proof.loadedModel.sizeVramBytes)}</p> : null}</div> : null}
                  {proof.configuredCompute ? <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Configured compute</p><p className="mt-1 text-sm font-semibold">{proof.configuredCompute}</p><p className="mt-1 text-xs text-slate-500">Environment configuration, not hardware attestation</p></div> : null}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Proof timestamp</p><p className="mt-1 text-xs font-semibold">{new Date(proof.proofTimestamp).toLocaleString()}</p></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {proof.deploymentCommitSha ? (
                    <a href={`${REPOSITORY_URL}/commit/${proof.deploymentCommitSha}`} target="_blank" rel="noreferrer" className="focus-ring rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-100">View this exact build on GitHub · {shortSha(proof.deploymentCommitSha)}</a>
                  ) : (
                    <span className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs text-slate-400">Deployment commit SHA unavailable</span>
                  )}
                  {SOURCE_FILES.map(([label, path]) => (
                    <a key={path} href={`${REPOSITORY_URL}/blob/${sourceRef}/${path}`} target="_blank" rel="noreferrer" className="focus-ring rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white">{label}</a>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
