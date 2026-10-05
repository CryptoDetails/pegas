"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { WorkflowEvent } from "@/lib/workflow/types";
import { accuracy, median, percentile, reduceWorkflowEvents, type EvaluationCaseResult, type WorkflowEvaluationCase } from "@/lib/workflow/evaluation";

export function WorkflowEvaluationDashboard({ cases }: { cases: WorkflowEvaluationCase[] }) {
  const [state,setState]=useState<"idle"|"running"|"complete"|"partial">("idle");
  const [completed,setCompleted]=useState(0);
  const [results,setResults]=useState<Record<string,EvaluationCaseResult>>({});

  const metrics=useMemo(()=>{
    const all=cases.map(c=>({c,r:results[c.id]})).filter((x):x is {c:WorkflowEvaluationCase;r:EvaluationCaseResult}=>Boolean(x.r));
    const complete=all.filter(x=>x.r.complete);
    const routed=all.filter(x=>x.c.expected_department!==null && x.r.complete);
    const routeCorrect=routed.filter(x=>x.r.department===x.c.expected_department).length;
    const outcomeCorrect=complete.filter(x=>x.r.outcome===x.c.expected_outcome).length;
    const privacyCorrect=complete.filter(x=>x.r.privacyActivated===x.c.expected_privacy).length;
    const privacyCases=complete.filter(x=>x.c.expected_privacy);
    const boundaryOk=privacyCases.filter(x=>x.r.boundaryCompliant).length;
    const durations=complete.map(x=>x.r.durationMs);
    const calls=complete.map(x=>x.r.logicalAgentCalls);
    return {
      route:accuracy(routeCorrect,routed.length), outcome:accuracy(outcomeCorrect,complete.length), privacy:accuracy(privacyCorrect,complete.length), boundary:accuracy(boundaryOk,privacyCases.length), completion:accuracy(complete.length,all.length), median:median(durations), p95:percentile(durations,.95), avgCalls:calls.length?calls.reduce((a,b)=>a+b,0)/calls.length:null, maxCalls:calls.length?Math.max(...calls):null, corrections:complete.filter(x=>x.r.correctionUsed).length,
    };
  },[cases,results]);

  async function run() {
    if(state==="running") return;
    setState("running"); setCompleted(0); setResults({}); let interrupted=false;
    for(let i=0;i<cases.length;i++){
      const c=cases[i]; const events:WorkflowEvent[]=[]; const started=performance.now();
      try {
        const response=await fetch("/api/workflows/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:c.message})});
        if(!response.ok||!response.body) throw new Error("request_failed");
        const reader=response.body.getReader(); const decoder=new TextDecoder(); let buffer="";
        while(true){ const {value,done}=await reader.read(); if(done) break; buffer+=decoder.decode(value,{stream:true}); const frames=buffer.split("\n\n"); buffer=frames.pop()??""; for(const frame of frames){ const line=frame.split("\n").find(x=>x.startsWith("data: ")); if(line) events.push(JSON.parse(line.slice(6)) as WorkflowEvent); } }
      } catch { interrupted=true; }
      const result=reduceWorkflowEvents(c.id,events,Math.max(0,Math.round(performance.now()-started)));
      if(interrupted&&!result.error) result.error="request_failed";
      setResults(prev=>({...prev,[c.id]:result})); setCompleted(i+1);
    }
    setState(interrupted?"partial":"complete");
  }

  const pct=(v:number|null)=>v===null?"—":`${Math.round(v*100)}%`;
  return <div>
    <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
      <div><span className="rounded-full border border-[var(--pegas-border)] bg-[var(--pegas-blue-soft)] px-3 py-1 text-xs font-bold text-[var(--pegas-blue-dark)]">Workflow evaluation · v1 · 12 cases</span><h1 className="mt-5 text-4xl font-semibold tracking-[-.04em] text-slate-950 sm:text-5xl">Evaluate the actual Request Desk.</h1><p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">This page runs the frozen fictional dataset sequentially through the same <code>/api/workflows/run</code> SSE endpoint as the Demo. It can wake the GPU and execute multiple model calls.</p></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 card-shadow"><button onClick={run} disabled={state==="running"} className="pegas-primary-button focus-ring w-full rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{state==="running"?`Running ${completed} of ${cases.length}…`:"Run 12-case workflow evaluation"}</button><p className="mt-3 text-xs leading-5 text-slate-500">Never auto-runs. Cases are executed one at a time.</p></div>
    </section>
    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Route accuracy" value={state==="idle"?"Not run":pct(metrics.route)}/><Metric label="Outcome accuracy" value={state==="idle"?"Not run":pct(metrics.outcome)}/><Metric label="Privacy accuracy" value={state==="idle"?"Not run":pct(metrics.privacy)}/><Metric label="Boundary compliance" value={state==="idle"?"Not run":pct(metrics.boundary)}/><Metric label="Completion rate" value={state==="idle"?"Not run":pct(metrics.completion)}/>
      <Metric label="Median duration" value={state==="idle"||metrics.median===null?"Not run":`${metrics.median} ms`}/><Metric label="P95 duration" value={state==="idle"||metrics.p95===null?"Not run":`${metrics.p95} ms`}/><Metric label="Avg logical calls" value={state==="idle"||metrics.avgCalls===null?"Not run":metrics.avgCalls.toFixed(1)}/><Metric label="Max logical calls" value={state==="idle"||metrics.maxCalls===null?"Not run":String(metrics.maxCalls)}/><Metric label="Correction usage" value={state==="idle"?"Not run":String(metrics.corrections)}/>
    </section>
    {state==="partial"&&<div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Partial evaluation.</strong> At least one run failed or ended without a terminal workflow event.</div>}
    <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white card-shadow"><div className="border-b border-slate-200 p-5"><h2 className="text-lg font-semibold text-slate-950">Expected vs actual</h2><p className="mt-1 text-sm text-slate-500">Measured only from real SSE events. Duplicate event IDs are ignored.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{["Case","Expected","Actual","Privacy","Boundary","Calls","Duration"].map(h=><th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr></thead><tbody>{cases.map(c=>{const r=results[c.id];return <tr key={c.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-800">{c.id}</td><td className="px-4 py-3 text-slate-600">{c.expected_outcome}<br/>{c.expected_department??"—"}</td><td className="px-4 py-3 text-slate-600">{r?r.complete?`${r.outcome} / ${r.department??"—"}`:`Incomplete: ${r.error??"stream"}`:"—"}</td><td className="px-4 py-3 text-slate-600">{r?`${r.privacyActivated} / expected ${c.expected_privacy}`:"—"}</td><td className="px-4 py-3 text-slate-600">{r?(c.expected_privacy?(r.boundaryCompliant?"pass":"fail"):"n/a"):"—"}</td><td className="px-4 py-3 text-slate-600">{r?.logicalAgentCalls??"—"}</td><td className="px-4 py-3 text-slate-600">{r?`${r.durationMs} ms`:"—"}</td></tr>})}</tbody></table></div></section>
    <p className="mt-5 text-sm text-slate-500">For historical comparison only: <Link href="/benchmark" className="font-semibold text-[var(--pegas-blue-dark)] underline">legacy single-step benchmark</Link>.</p>
  </div>;
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>}
