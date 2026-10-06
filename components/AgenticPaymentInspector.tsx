import type { ReactNode } from "react";
import type { FinalRequestCard, WorkflowEvent } from "@/lib/workflow/types";
import type { PublicAgenticPaymentEvidence } from "@/lib/payments/types";

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function latestEvent(events: WorkflowEvent[], type: WorkflowEvent["type"]) {
  return [...events].reverse().find((event) => event.type === type);
}

function eventPayload(events: WorkflowEvent[], type: WorkflowEvent["type"]) {
  return record(latestEvent(events, type)?.payload);
}

function short(value: string | undefined | null) {
  return value ? value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value : "—";
}

function stringField(source: Record<string, unknown> | null, ...keys: string[]) {
  if (!source) return null;
  for (const key of keys) if (typeof source[key] === "string") return source[key] as string;
  return null;
}

function booleanField(source: Record<string, unknown> | null, ...keys: string[]) {
  if (!source) return null;
  for (const key of keys) if (typeof source[key] === "boolean") return source[key] as boolean;
  return null;
}

function settlementPayload(events: WorkflowEvent[]) {
  const confirmed = eventPayload(events, "payment_confirmed");
  const settled = eventPayload(events, "payment_settled");
  for (const payload of [confirmed, settled]) {
    if (!payload) continue;
    const settlement = record(payload.settlement);
    if (settlement) return settlement;
    const evidence = record(payload.evidence);
    if (evidence) {
      const nestedSettlement = record(evidence.settlement);
      return nestedSettlement ?? evidence;
    }
    return payload;
  }
  return null;
}

export function AgenticPaymentInspector({ events, card }: { events: WorkflowEvent[]; card: FinalRequestCard | null }) {
  const evidence = card?.agentic_payment_evidence as PublicAgenticPaymentEvidence | undefined;
  const mandate = eventPayload(events, "mandate_created");
  const policy = eventPayload(events, "mandate_policy_checked");
  const settlementEvent = settlementPayload(events);
  const paymentConfirmedEvent = latestEvent(events, "payment_confirmed");
  const consultationCompleted = latestEvent(events, "consultation_completed");
  const consultationFailed = latestEvent(events, "consultation_failed");

  if (!evidence && !mandate && !policy && !settlementEvent && !paymentConfirmedEvent) return null;

  const provider = evidence?.settlement.evidence_provider ?? stringField(settlementEvent, "evidence_provider", "provider");
  const signature = evidence?.settlement.transaction_signature ?? stringField(settlementEvent, "transaction_signature", "signature");
  const explorerUrl = evidence?.settlement.explorer_url ?? stringField(settlementEvent, "explorer_url");
  const offerMatch = evidence?.settlement.transfer_matches_offer ?? booleanField(settlementEvent, "transfer_matches_offer");
  const confirmation = evidence?.settlement.confirmation_status ?? stringField(settlementEvent, "confirmation_status", "status") ?? (paymentConfirmedEvent ? "payment_confirmed event received" : "unavailable");
  const checkedAt = evidence?.settlement.checked_at ?? stringField(settlementEvent, "checked_at", "timestamp") ?? paymentConfirmedEvent?.timestamp ?? null;
  const runtimeProofAvailable = Boolean(evidence || paymentConfirmedEvent);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 card-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Agentic payment inspector</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Reconstructable payment evidence</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">A readable chain from delegated authority to identity, deterministic policy, settlement evidence and Legal delivery.</p></div>
        {runtimeProofAvailable && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Runtime evidence</span>}
      </div>

      {!evidence && paymentConfirmedEvent && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-900">On-chain confirmation event received</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">The later workflow may still fail. This payment-side event remains visible and is not converted into a successful Legal result.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MiniFact label="Confirmation" value={confirmation} />
            <MiniFact label="Offer match" value={offerMatch === null ? "—" : offerMatch ? "true" : "false"} />
            <MiniFact label="Evidence provider" value={provider === "alchemy" ? "Verified via Alchemy" : provider ?? "—"} />
            <MiniFact label="Observed at" value={checkedAt ?? "—"} />
          </div>
          {explorerUrl && <a className="mt-3 inline-flex text-xs font-bold text-emerald-900 underline" href={explorerUrl} target="_blank" rel="noreferrer">Open Solana Explorer ↗</a>}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="AUTHORITY">
          <KV k="Principal" v={evidence?.authority.principal_id ?? "pegas-request-desk"} />
          <KV k="Acting agent" v={evidence?.authority.acting_agent_id ?? "pegas:routing-agent:v1"} />
          <KV k="Service" v={evidence?.authority.service_id ?? "legal_consultation"} />
          <KV k="Purpose" v={evidence?.authority.purpose ?? stringField(mandate, "purpose") ?? "—"} />
          <KV k="Max amount" v={`${evidence?.authority.max_amount_atomic ?? stringField(mandate, "max_amount_atomic") ?? "10000"} atomic`} />
          <KV k="Max authorizations" v={String(evidence?.authority.max_authorizations ?? mandate?.max_authorizations ?? 1)} />
          <KV k="Mandate state" v={evidence?.authority.state ?? stringField(mandate, "state") ?? "active"} />
          <KV k="Fingerprint" v={short(evidence?.authority.mandate_fingerprint_sha256 ?? stringField(mandate, "fingerprint_sha256"))} />
        </Panel>

        <Panel title="IDENTITY">
          <KV k="Registry" v={evidence?.identity.registry_label ?? "KYA-lite | Demo identity registry"} />
          <KV k="Buyer agent" v={evidence?.identity.buyer_agent_id ?? "pegas:routing-agent:v1"} />
          <KV k="Buyer wallet" v={short(evidence?.identity.buyer_address)} />
          <KV k="Seller agent" v={evidence?.identity.seller_agent_id ?? "pegas:legal-advisor:v1"} />
          <KV k="Seller wallet" v={short(evidence?.identity.seller_address)} />
        </Panel>

        <Panel title="POLICY">
          <KV k="Decision" v={evidence?.policy.decision ?? stringField(policy, "decision") ?? "—"} />
          {evidence?.policy.controls?.length ? evidence.policy.controls.map((control) => (
            <div key={control.id} className="mt-2 rounded-xl bg-slate-50 p-2 text-xs">
              <b>{control.id} {control.passed ? "✓" : "✕"}</b><span className="ml-2 text-slate-600">{control.public_reason}</span>
            </div>
          )) : <p className="mt-2 text-xs leading-5 text-slate-500">Detailed public AUTH reasons appear when runtime evidence is present.</p>}
        </Panel>

        <Panel title="SETTLEMENT">
          <KV k="Protocol" v="x402 V2 · exact · upfront" />
          <KV k="Network" v={evidence?.settlement.network_label ?? "Solana Devnet"} />
          <KV k="Asset" v={evidence?.settlement.token_label ?? "test USDC"} />
          <KV k="Amount" v={evidence ? `${evidence.settlement.amount_atomic} atomic · 0.01 test USDC` : "0.01 test USDC"} />
          <KV k="Token payer" v={short(evidence?.settlement.token_payer ?? stringField(settlementEvent, "token_payer"))} />
          <KV k="Recipient owner" v={short(evidence?.settlement.recipient_owner ?? stringField(settlementEvent, "recipient_owner"))} />
          <KV k="Facilitator fee payer" v={short(evidence?.settlement.facilitator_fee_payer ?? stringField(settlementEvent, "facilitator_fee_payer"))} />
          <KV k="Signature" v={short(signature)} />
          <KV k="Evidence provider" v={provider === "alchemy" ? "Verified via Alchemy" : provider === "configured_solana_rpc" ? "Configured Solana RPC" : provider ?? "—"} />
          <KV k="Confirmation" v={confirmation} />
          <KV k="Offer match" v={offerMatch === null ? "—" : offerMatch ? "true" : "false"} />
          <KV k="Evidence time" v={checkedAt ?? "—"} />
          {explorerUrl && <a className="mt-3 inline-flex text-xs font-bold text-[var(--pegas-blue-dark)] underline" href={explorerUrl} target="_blank" rel="noreferrer">Open Solana Explorer ↗</a>}
        </Panel>

        <Panel title="LEGAL DELIVERY">
          <KV k="Delivery status" v={evidence?.consultation.delivery_status ?? (consultationCompleted ? "completed" : consultationFailed ? "failed" : "not_started")} />
          <KV k="Policy version" v={evidence?.consultation.policy_version ?? "pegas-demo-legal-v1"} />
          <p className="mt-3 text-xs leading-5 text-slate-500">Routing review and payment success do not mean a contract was approved.</p>
        </Panel>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-[11px] font-bold tracking-[0.14em] text-slate-500">{title}</p><div className="mt-3">{children}</div></div>;
}

function KV({ k, v }: { k: string; v: string }) {
  return <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 text-xs"><span className="text-slate-400">{k}</span><span className="break-all font-medium text-slate-700">{v}</span></div>;
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/75 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{label}</p><p className="mt-1 break-all text-xs font-semibold text-emerald-950">{value}</p></div>;
}
