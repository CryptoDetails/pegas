import type { ReactNode } from "react";
import type { FinalRequestCard } from "@/lib/workflow/types";
import type { PublicAgenticPaymentEvidence } from "@/lib/payments/types";

export function WorkflowResultCard({ card }: { card: FinalRequestCard }) {
  const routed = card.outcome === "routed_demo";
  const needsInfo = card.outcome === "needs_information";
  const correctionLabel = correctionSummary(card);
  const paid = card.scenario === "paid_legal";
  const evidence = card.agentic_payment_evidence as PublicAgenticPaymentEvidence | null | undefined;
  const paidDelivered = paid && Boolean(card.legal_consultation);
  const heading = paidDelivered
    ? "Paid Legal assessment delivered"
    : routed
      ? "Ready for department review"
      : needsInfo
        ? "More information needed"
        : "Manual review required";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 card-shadow">
      {paid && evidence && <PaymentProof evidence={evidence} />}

      <div className={`${paid && evidence ? "mt-6 border-t border-slate-100 pt-6" : ""} flex flex-wrap items-center justify-between gap-3`}>
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Final request card</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{heading}</h2></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${routed ? "bg-emerald-50 text-emerald-700" : needsInfo ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"}`}>{card.outcome.replaceAll("_", " ")}</span>
      </div>

      {paid && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><b>Routing review ≠ contract approval.</b> A delivered Legal result is a demo policy assessment only.</div>}
      {correctionLabel && <div className="mt-5 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800">{correctionLabel}</div>}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Fact label="Department" value={paid ? (card.paid_department ?? "Not selected") : (card.department ?? "Not selected")} />
        <Fact label="Priority" value={card.priority ?? "—"} />
        <Fact label="Review" value={card.review_status.replaceAll("_", " ")} />
      </div>
      {card.summary && <Box label="Summary">{card.summary}</Box>}
      {card.department_note && <Text label="Department brief">{card.department_note}</Text>}
      {card.next_action && <Text label="Next action">{card.next_action}</Text>}
      <Text label="Route explanation">{card.route_explanation}</Text>

      {paid && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Section title="AGENT AUTHORITY">
            {evidence ? <>
              <p>Mandate <b>{short(evidence.authority.mandate_id)}</b></p>
              <p className="mt-2">Policy: <b>{evidence.policy.decision}</b> · {evidence.policy.controls.filter((control) => control.passed).length}/{evidence.policy.controls.length} controls passed</p>
              <p className="mt-2">Max authorizations: <b>{evidence.authority.max_authorizations}</b> · state: <b>{evidence.authority.state}</b></p>
            </> : <p>Runtime payment evidence was not attached to the final card.</p>}
          </Section>
          <Section title="LEGAL ASSESSMENT">
            {card.legal_consultation ? <>
              <p className="font-semibold">{card.legal_consultation.advisory.verdict.replaceAll("_", " ")}</p>
              <p className="mt-2">{card.legal_consultation.advisory.summary}</p>
              <p className="mt-3 text-[11px] font-semibold text-amber-700">{card.legal_consultation.disclaimer}</p>
            </> : <><p>No Legal advisory was delivered.</p><p className="mt-3 text-[11px] font-semibold text-amber-700">Demo policy assessment. Not legal advice or approval to sign.</p></>}
          </Section>
        </div>
      )}

      {card.clarification_question && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Clarification</p><p className="mt-2 text-sm font-medium text-amber-950">{card.clarification_question}</p></div>}
    </section>
  );
}

function PaymentProof({ evidence }: { evidence: PublicAgenticPaymentEvidence }) {
  const confirmed = evidence.settlement.confirmation_status === "confirmed" || evidence.settlement.confirmation_status === "finalized";
  const verified = confirmed && evidence.settlement.transfer_matches_offer === true;
  const passed = evidence.policy.controls.filter((control) => control.passed).length;
  return (
    <div className={`rounded-3xl border p-5 ${verified ? "border-emerald-200 bg-emerald-50/70" : "border-indigo-100 bg-indigo-50/50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.16em] ${verified ? "text-emerald-700" : "text-indigo-600"}`}>Agentic payment evidence</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{verified ? "Agent payment verified on Solana Devnet" : "Agent payment evidence"}</h3>
          <p className="mt-2 text-sm font-semibold text-slate-700">0.01 test USDC · x402 V2 · exact · upfront</p>
        </div>
        {evidence.settlement.evidence_provider === "alchemy" && <span className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">Verified via Alchemy</span>}
        {evidence.settlement.evidence_provider !== "alchemy" && <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">Configured Solana RPC evidence</span>}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProofFact label="Mandate" value={evidence.authority.state} />
        <ProofFact label="Policy" value={`${evidence.policy.decision} · ${passed}/${evidence.policy.controls.length} AUTH passed`} />
        <ProofFact label="Authorization cap" value={`max ${evidence.authority.max_authorizations}`} />
        <ProofFact label="Confirmation" value={evidence.settlement.confirmation_status} />
        <ProofFact label="Buyer agent" value={evidence.identity.buyer_agent_id} />
        <ProofFact label="Seller agent" value={evidence.identity.seller_agent_id} />
        <ProofFact label="Offer match" value={String(evidence.settlement.transfer_matches_offer)} />
        <ProofFact label="Evidence time" value={evidence.settlement.checked_at ?? "—"} />
      </div>
      <div className="mt-4 rounded-2xl border border-white/80 bg-white/75 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transaction signature</p>
        <p className="mt-1 break-all font-mono text-xs text-slate-700">{evidence.settlement.transaction_signature ?? "—"}</p>
        {evidence.settlement.explorer_url && <a href={evidence.settlement.explorer_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-bold text-[var(--pegas-blue-dark)] underline">Open Solana Explorer ↗</a>}
      </div>
    </div>
  );
}

function correctionSummary(card: FinalRequestCard) {
  const initial = card.scenario === "paid_legal" ? card.initial_paid_department : card.initial_department;
  const current = card.scenario === "paid_legal" ? card.paid_department : card.department;
  if (card.revision_count !== 1 || !initial || !current) return null;
  if (initial === current) return "Revised once";
  return `Rerouted ${capitalize(initial)} → ${capitalize(current)}`;
}
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function short(value: string) { return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value; }
function Fact({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold capitalize text-slate-800">{value}</p></div>; }
function ProofFact({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/80 bg-white/75 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-all text-xs font-semibold text-slate-800">{value}</p></div>; }
function Box({ label, children }: { label: string; children: ReactNode }) { return <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-sm leading-6 text-slate-700">{children}</p></div>; }
function Text({ label, children }: { label: string; children: ReactNode }) { return <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm leading-6 text-slate-700">{children}</p></div>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 text-xs leading-5 text-slate-700"><p className="mb-3 font-bold tracking-[0.14em] text-indigo-600">{title}</p>{children}</div>; }
