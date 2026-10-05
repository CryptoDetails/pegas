import type { Confidentiality } from "../workflow/types";

export const SOLANA_DEVNET_CAIP2 = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const;
export const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" as const;
export const LEGAL_AMOUNT_ATOMIC = "10000" as const;

export type AgentMandateState = "active" | "consumed" | "revoked" | "expired";
export type AgentMandate = {
  mandate_id: string;
  operation_id: string;
  principal: { type: "application"; id: "pegas-request-desk"; label: "Pegas Request Desk" };
  acting_agent: { agent_id: "pegas:routing-agent:v1"; role: "routing_agent" };
  service_id: "legal_consultation";
  purpose: string;
  counterparty_agent_id: "pegas:legal-advisor:v1";
  allowed_payee: string;
  network: typeof SOLANA_DEVNET_CAIP2;
  asset_mint: string;
  max_amount_atomic: "10000";
  max_authorizations: 1;
  created_at: string;
  expires_at: string;
  state: AgentMandateState;
  fingerprint_sha256: string;
};

export type AgentRegistryEntry = {
  agent_id: "pegas:routing-agent:v1" | "pegas:legal-advisor:v1";
  operator: "Pegas";
  role: "routing_agent" | "legal_advisor_agent";
  environment: "demo";
  status: "registered";
  allowed_services: string[];
  payment_address: string | null;
  protocol: "x402" | null;
  network: string | null;
};

export type X402PaymentRequirement = {
  scheme: "exact";
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: { feePayer?: string; paymentFlow?: string; memo?: string; [key: string]: unknown };
};

export type X402PaymentRequired = {
  x402Version: 2;
  error?: string;
  resource: { url: string; description: string; mimeType: string; serviceName?: string };
  accepts: X402PaymentRequirement[];
  extensions?: Record<string, unknown>;
};

export type MandateControlId = `AUTH-${"01"|"02"|"03"|"04"|"05"|"06"|"07"|"08"|"09"|"10"}`;
export type MandateControlResult = { id: MandateControlId; label: string; passed: boolean; public_reason: string };
export type MandatePolicyDecision = { mandate_id: string; decision: "approved" | "declined"; checked_at: string; controls: MandateControlResult[] };

export type ChainEvidenceStatus = "unavailable" | "pending" | "confirmed" | "finalized" | "failed";
export type ChainEvidence = {
  status: ChainEvidenceStatus;
  transaction_signature: string | null;
  explorer_url: string | null;
  token_payer: string | null;
  recipient_owner: string | null;
  amount_atomic: string | null;
  asset_mint: string | null;
  transfer_matches_offer: boolean | null;
  checked_at: string | null;
};

export type PublicAgenticPaymentEvidence = {
  operation_id: string;
  authority: {
    mandate_id: string;
    mandate_fingerprint_sha256: string;
    principal_id: "pegas-request-desk";
    acting_agent_id: "pegas:routing-agent:v1";
    counterparty_agent_id: "pegas:legal-advisor:v1";
    service_id: "legal_consultation";
    purpose: string;
    max_amount_atomic: "10000";
    max_authorizations: 1;
    expires_at: string;
    state: AgentMandateState;
  };
  policy: { decision: "approved" | "declined"; checked_at: string; controls: MandateControlResult[] };
  identity: {
    buyer_agent_id: "pegas:routing-agent:v1";
    seller_agent_id: "pegas:legal-advisor:v1";
    registry_label: "KYA-lite | Demo identity registry";
    buyer_address: string;
    seller_address: string;
  };
  settlement: {
    protocol: "x402";
    protocol_version: 2;
    scheme: "exact";
    payment_flow: "upfront";
    network: typeof SOLANA_DEVNET_CAIP2;
    network_label: "Solana Devnet";
    asset_mint: string;
    token_label: "test USDC";
    amount_atomic: "10000";
    decimals: 6;
    token_payer: string;
    recipient_owner: string;
    transaction_signature: string | null;
    explorer_url: string | null;
    facilitator_fee_payer: string | null;
    confirmation_status: ChainEvidenceStatus;
    evidence_provider: "alchemy" | "configured_solana_rpc";
    transfer_matches_offer: boolean | null;
    checked_at: string | null;
  };
  consultation: { delivery_status: "not_started" | "completed" | "failed"; policy_version: "pegas-demo-legal-v1" };
};

export type LegalModelContext = {
  safe_brief: string;
  question: string;
  relevant_evidence: string[];
  confidentiality: Confidentiality;
  recipient_restrictions: string[];
  demo_policy: { version: "pegas-demo-legal-v1"; rules: Array<{ id: "DL-01"|"DL-02"|"DL-03"; text: string }> };
};
