import { readPaymentConfig, validatePaymentConfig } from "@/lib/payments/config";
import { verifyInternalEnvelope } from "@/lib/payments/internal-auth";
import { PaymentLedger } from "@/lib/payments/store";
import {
  buildLegalPaymentRequired,
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  getFacilitatorSupport,
  requireFrozenOffer,
  settleThroughFacilitator,
} from "@/lib/payments/x402-server";
import { confirmSolanaEvidence } from "@/lib/payments/solana-evidence";
import { buildPublicEvidence } from "@/lib/payments/evidence";
import { fingerprintObject, runLegalAdvisor } from "@/lib/workflow/legal-consultation";
import type { LegalModelContext } from "@/lib/payments/types";
import type { SettleResponse } from "@x402/core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type PaymentRequirementLike = {
  scheme?: unknown;
  network?: unknown;
  amount?: unknown;
  asset?: unknown;
  payTo?: unknown;
  maxTimeoutSeconds?: unknown;
  extra?: { feePayer?: unknown; paymentFlow?: unknown; memo?: unknown } | null;
};
type PaymentResourceLike = { url?: unknown; description?: unknown; mimeType?: unknown; serviceName?: unknown };
type PaymentSignaturePayload = Record<string, unknown> & { x402Version?: unknown; accepted?: PaymentRequirementLike; resource?: PaymentResourceLike };
type LegalRequestBody = {
  operation_id: string;
  run_id: string;
  request_fingerprint: string;
  legal_context_fingerprint: string;
  legal_context: LegalModelContext;
  absolute_deadline: number;
  delivery_only?: boolean;
};

const noStore = { "Cache-Control": "no-store" };
function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers: { ...noStore, ...headers } });
}
function resourceUrl(base: string) {
  return `${base.replace(/\/$/, "")}/api/paid-services/legal-consultation`;
}
function sameRequirement(a: PaymentRequirementLike | null | undefined, b: PaymentRequirementLike | null | undefined) {
  return a && b && a.scheme === b.scheme && a.network === b.network && a.amount === b.amount &&
    a.asset === b.asset && a.payTo === b.payTo && a.maxTimeoutSeconds === b.maxTimeoutSeconds &&
    a.extra?.feePayer === b.extra?.feePayer && a.extra?.paymentFlow === b.extra?.paymentFlow && a.extra?.memo === b.extra?.memo;
}
function sameResource(a:PaymentResourceLike|null|undefined,b:PaymentResourceLike|null|undefined){return a&&b&&a.url===b.url&&a.description===b.description&&a.mimeType===b.mimeType&&a.serviceName===b.serviceName;}
function isCaip2Network(value: unknown): value is `${string}:${string}` {
  return typeof value === "string" && value.includes(":");
}
function isSettleResponse(value: Record<string, unknown>): value is SettleResponse {
  return value.success === true && typeof value.transaction === "string" &&
    isCaip2Network(value.network) && typeof value.payer === "string";
}
function requireSettleResponse(value: Record<string, unknown>): SettleResponse {
  if (!isSettleResponse(value)) throw new TypeError("Invalid x402 settle response");
  return value;
}

export async function POST(request: Request) {
  const checked = validatePaymentConfig();
  if (!checked.ok) return json({ error: "paid_feature_unavailable", details: checked.errors }, 503);
  const config = checked.config;

  let body: LegalRequestBody;
  try { body = await request.json() as LegalRequestBody; } catch { return json({ error: "invalid_json" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "invalid_request" }, 400);

  const token = request.headers.get("X-Pegas-Internal-Auth") ?? "";
  const envelope = verifyInternalEnvelope(token, config.legalServiceAuthSecret);
  if (!envelope) return json({ error: "invalid_internal_auth" }, 401);
  if (
    body.operation_id !== envelope.operation_id || body.run_id !== envelope.run_id ||
    body.request_fingerprint !== envelope.request_fingerprint || body.legal_context_fingerprint !== envelope.legal_context_fingerprint ||
    body.absolute_deadline !== envelope.absolute_deadline
  ) return json({ error: "request_binding_mismatch" }, 403);
  if (fingerprintObject(body.legal_context) !== envelope.legal_context_fingerprint) return json({ error: "legal_context_binding_mismatch" }, 403);

  const ledger = new PaymentLedger(config);
  let op;
  try { op = await ledger.get(body.operation_id); } catch { return json({ error: "payment_ledger_unavailable" }, 503); }
  if (!op || op.run_id !== body.run_id || !op.mandate) return json({ error: "operation_not_ready" }, 409);

  if (op.state === "consultation_completed" && op.seller_result) return json(op.seller_result, 200);

  // Delivery is a separate post-settlement phase so the public orchestrator can emit the
  // real routing -> Legal handoff immediately before the Legal model is actually invoked.
  if (body.delivery_only === true) {
    const proven = op.mandate.state === "consumed" && op.policy?.decision === "approved" && op.authorization_count === 1 &&
      op.evidence?.settlement.transfer_matches_offer === true &&
      (op.evidence.settlement.confirmation_status === "confirmed" || op.evidence.settlement.confirmation_status === "finalized");
    if (!proven || !op.evidence) return json({ error: "confirmed_payment_required_before_delivery" }, 409);
    let evidence = op.evidence;
    try {
      const legal = await runLegalAdvisor({
        operationId: body.operation_id,
        context: body.legal_context as LegalModelContext,
        absoluteDeadline: envelope.absolute_deadline,
        attemptGrant: envelope.remaining_model_attempt_grant,
      });
      evidence = { ...evidence, consultation: { ...evidence.consultation, delivery_status: "completed" } };
      const result = { operation_id: body.operation_id, evidence, legal_consultation: legal };
      await ledger.saveSellerResult(body.operation_id, "consultation_completed", result, evidence);
      return json(result, 200);
    } catch {
      evidence = { ...evidence, consultation: { ...evidence.consultation, delivery_status: "failed" } };
      await ledger.saveSellerResult(body.operation_id, "consultation_failed", { error: "legal_consultation_failed", evidence }, evidence);
      return json({ error: "legal_consultation_failed", evidence }, 502);
    }
  }

  if (op.mandate.state !== "active") return json({ error: "mandate_not_active" }, 409);
  const remaining = Math.max(1, envelope.absolute_deadline - Date.now());
  const support = await getFacilitatorSupport(config, remaining);
  if (!support.supported) return json({ error: "facilitator_unsupported", reason: support.reason }, 503);
  const url = resourceUrl(config.legalServiceBaseUrl);
  const required = buildLegalPaymentRequired({ config, resourceUrl: url, feePayer: support.feePayer, operationId: body.operation_id });
  if (!requireFrozenOffer(required, config, url)) return json({ error: "frozen_offer_invalid" }, 500);

  const paymentHeader = request.headers.get("PAYMENT-SIGNATURE");
  if (!paymentHeader) return json({ error: "payment_required", ...required }, 402, { "PAYMENT-REQUIRED": await encodePaymentRequiredHeader(required) });
  if (!op.policy || op.policy.decision !== "approved") return json({ error: "authority_not_approved" }, 409);
  if (op.authorization_count !== 1) return json({ error: "authorization_not_reserved" }, 409);

  // Re-read immediately before accepting authorization. Feature flag is a kill switch.
  const secondConfig = readPaymentConfig();
  if (!secondConfig.enabled) return json({ error: "payment_kill_switch_active" }, 409);
  if (!requireFrozenOffer(required, secondConfig, url)) return json({ error: "payment_authority_changed_before_settlement" }, 409);
  const fresh = await ledger.get(body.operation_id);
  if (!fresh?.mandate || fresh.mandate.state !== "active" || fresh.authorization_count !== 1 || fresh.policy?.decision !== "approved") {
    return json({ error: "mandate_not_active_before_settlement" }, 409);
  }

  let paymentPayload: PaymentSignaturePayload;
  try { paymentPayload = await decodePaymentSignatureHeader(paymentHeader) as PaymentSignaturePayload; } catch {
    return json({ error: "invalid_PAYMENT_SIGNATURE" }, 402, { "PAYMENT-REQUIRED": await encodePaymentRequiredHeader(required) });
  }
  if (paymentPayload?.x402Version !== 2 || !sameRequirement(paymentPayload.accepted, required.accepts[0]) || !sameResource(paymentPayload.resource, required.resource)) {
    return json({ error: "payment_payload_quote_mismatch" }, 402, { "PAYMENT-REQUIRED": await encodePaymentRequiredHeader(required) });
  }

  const settlement = await settleThroughFacilitator({
    config,
    paymentPayload,
    requirement: required.accepts[0],
    remainingMs: envelope.absolute_deadline - Date.now(),
  });
  if (settlement.kind === "unknown") {
    await ledger.saveSellerResult(body.operation_id, "outcome_unknown", { error: "settlement_outcome_unknown", settlement: null });
    return json({ error: "settlement_outcome_unknown" }, 504);
  }
  if (settlement.kind !== "settled") {
    await ledger.saveSellerResult(body.operation_id, "failed", { error: "settlement_failed" });
    return json({ error: "settlement_failed" }, 402, { "PAYMENT-REQUIRED": await encodePaymentRequiredHeader(required) });
  }

  const settlementBody = requireSettleResponse(settlement.body);
  await ledger.markSettlement(body.operation_id, settlement.transaction);
  const chain = await confirmSolanaEvidence({
    config,
    signature: settlement.transaction,
    quote: required.accepts[0],
    remainingMs: envelope.absolute_deadline - Date.now(),
  });
  let evidence = buildPublicEvidence({
    config,
    operationId: body.operation_id,
    mandate: fresh.mandate,
    policy: fresh.policy,
    feePayer: support.feePayer,
    chain,
    deliveryStatus: "not_started",
  });
  if ((chain.status !== "confirmed" && chain.status !== "finalized") || chain.transfer_matches_offer !== true) {
    await ledger.saveSellerResult(
      body.operation_id,
      chain.status === "pending" ? "settled" : "failed",
      { error: chain.status === "pending" ? "payment_confirmation_pending" : "chain_evidence_failed", evidence },
      evidence,
    );
    return json(
      { error: chain.status === "pending" ? "payment_confirmation_pending" : "chain_evidence_failed", evidence },
      chain.status === "pending" ? 202 : 502,
      { "PAYMENT-RESPONSE": await encodePaymentResponseHeader(settlementBody) },
    );
  }

  evidence = { ...evidence, authority: { ...evidence.authority, state: "consumed" } };
  await ledger.consumeMandate(body.operation_id, evidence);
  return json(
    {
      operation_id: body.operation_id,
      settlement: { transaction: settlement.transaction, payer: settlement.payer, fee_payer: support.feePayer },
      evidence,
      legal_ready: true,
    },
    200,
    { "PAYMENT-RESPONSE": await encodePaymentResponseHeader(settlementBody) },
  );
}
