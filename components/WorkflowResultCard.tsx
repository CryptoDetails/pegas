import type { ReactNode } from "react";
import type { FinalRequestCard } from "@/lib/workflow/types";

export function WorkflowResultCard({ card }: { card: FinalRequestCard }) {
  const routed = card.outcome === "routed_demo";
  const needsInfo = card.outcome === "needs_information";
  const correctionLabel = correctionSummary(card);
  const paid = card.scenario === "paid_legal";
  const evidence = card.agentic_payment_evidence;
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 card-shadow">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Final request card</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{routed?"Ready for department review":needsInfo?"More information needed":"Manual review required"}</h2></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${routed?"bg-emerald-50 text-emerald-700":needsInfo?"bg-amber-50 text-amber-800":"bg-rose-50 text-rose-700"}`}>{card.outcome.replaceAll("_"," ")}</span></div>
    {correctionLabel&&<div className="mt-5 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800">{correctionLabel}</div>}
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><Fact label="Department" value={paid?(card.paid_department??"Not selected"):(card.department??"Not selected")}/><Fact label="Priority" value={card.priority??"—"}/><Fact label="Review" value={card.review_status.replaceAll("_"," ")}/></div>
    {card.summary&&<Box label="Summary">{card.summary}</Box>}
    {card.department_note&&<Text label="Department brief">{card.department_note}</Text>}
    {card.next_action&&<Text label="Next action">{card.next_action}</Text>}
    <Text label="Route explanation">{card.route_explanation}</Text>
    {paid&&evidence&&<div className="mt-6 grid gap-4 lg:grid-cols-3"><Section title="AGENT AUTHORITY"><p>Mandate <b>{short(evidence.authority.mandate_id)}</b></p><p className="mt-2">Policy: <b>{evidence.policy.decision}</b> · {evidence.policy.controls.filter(c=>c.passed).length}/{evidence.policy.controls.length} controls passed</p><p className="mt-2">State: <b>{evidence.authority.state}</b></p></Section><Section title="LEGAL ASSESSMENT">{card.legal_consultation?<><p className="font-semibold">{card.legal_consultation.advisory.verdict.replaceAll("_"," ")}</p><p className="mt-2">{card.legal_consultation.advisory.summary}</p><p className="mt-3 text-[11px] font-semibold text-amber-700">{card.legal_consultation.disclaimer}</p></>:<p>No Legal advisory was delivered.</p>}</Section><Section title="PAID CONSULTATION"><p>x402 v2 · exact · upfront</p><p className="mt-2">0.01 test USDC · Solana Devnet</p><p className="mt-2">Chain evidence: <b>{evidence.settlement.confirmation_status}</b></p>{evidence.settlement.explorer_url&&<a href={evidence.settlement.explorer_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex font-bold text-[var(--pegas-blue-dark)] underline">Solana Explorer ↗</a>}</Section></div>}
    {card.clarification_question&&<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Clarification</p><p className="mt-2 text-sm font-medium text-amber-950">{card.clarification_question}</p></div>}
  </section>;
}
function correctionSummary(card:FinalRequestCard){const initial=card.scenario==="paid_legal"?card.initial_paid_department:card.initial_department;const current=card.scenario==="paid_legal"?card.paid_department:card.department;if(card.revision_count!==1||!initial||!current)return null;if(initial===current)return "Revised once";return `Rerouted ${capitalize(initial)} → ${capitalize(current)}`}
function capitalize(v:string){return v.charAt(0).toUpperCase()+v.slice(1)}
function short(v:string){return v.length>22?`${v.slice(0,10)}…${v.slice(-8)}`:v}
function Fact({label,value}:{label:string;value:string}){return <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold capitalize text-slate-800">{value}</p></div>}
function Box({label,children}:{label:string;children:ReactNode}){return <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-sm leading-6 text-slate-700">{children}</p></div>}
function Text({label,children}:{label:string;children:ReactNode}){return <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm leading-6 text-slate-700">{children}</p></div>}
function Section({title,children}:{title:string;children:ReactNode}){return <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 text-xs leading-5 text-slate-700"><p className="mb-3 font-bold tracking-[0.14em] text-indigo-600">{title}</p>{children}</div>}
