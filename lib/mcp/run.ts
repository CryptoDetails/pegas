import { runWorkflow } from "../workflow/orchestrator";
import type { FinalRequestCard, LegalAdvisory, WorkflowEvent } from "../workflow/types";
import type { MandatePolicyDecision, PublicAgenticPaymentEvidence } from "../payments/types";

// All MCP callers share one budget lane: the existing per-session and per-hour limits apply to all external agents together.
export const MCP_SESSION_SCOPE = "mcp:external-agents";

export type McpToolResult = { content: Array<{ type: "text"; text: string }>; structuredContent: Record<string, unknown>; isError?: boolean };
export type ProgressFn = (message: string) => void;
type RunOptions = { signal?: AbortSignal; progress?: ProgressFn };
type FailurePayload = { code?: string; message?: string };

const AGENT_LABELS: Record<string, string> = { intake_agent: "Intake agent", privacy_agent: "Privacy agent", routing_agent: "Routing agent", reviewer_agent: "Reviewer agent", legal_advisor_agent: "Legal Advisor" };
const PAYMENT_LABELS: Record<string, string> = {
  payment_required: "Seller returned the frozen x402 offer", payment_authorized: "Payment authorized by the server-side signer", payment_settling: "Payment settling via x402",
  payment_settled: "Payment settled", payment_confirmation_pending: "Payment confirmation pending", payment_confirmed: "Payment confirmed on-chain",
  payment_declined: "Payment declined by deterministic policy", payment_failed: "Payment failed", payment_outcome_unknown: "Payment outcome unknown",
  mandate_created: "Mandate created", mandate_policy_checked: "Mandate policy checked (AUTH-01..AUTH-10)", mandate_consumed: "Mandate consumed", mandate_revoked: "Mandate revoked",
};
const AMOUNT = "0.01 test USDC";
const NETWORK = "Solana Devnet";

export function sanitizeAgentName(raw: string | undefined) {
  const name = (raw ?? "").replace(/[^A-Za-z0-9 ._-]/g, "").trim().slice(0, 64).trim();
  return name || "unnamed external agent";
}

function progressLabel(event: WorkflowEvent): string | null {
  const agent = AGENT_LABELS[event.agent_id ?? ""] ?? "Agent";
  if (event.type === "agent_started") return `${agent} started`;
  if (event.type === "agent_completed") return `${agent} completed`;
  if (event.type === "agent_skipped") return `${agent} skipped`;
  if (event.type.startsWith("payment_") || event.type.startsWith("mandate_")) return PAYMENT_LABELS[event.type] ?? event.type.replace(/_/g, " ");
  return null;
}

function collector(progress?: ProgressFn) {
  const events: WorkflowEvent[] = [];
  const emit = (event: WorkflowEvent) => {
    events.push(event);
    const label = progress ? progressLabel(event) : null;
    if (label) try { progress!(label); } catch { /* best effort */ }
  };
  return { events, emit };
}

const find = (events: WorkflowEvent[], type: WorkflowEvent["type"]) => events.find((e) => e.type === type);
const payloadOf = <T>(events: WorkflowEvent[], type: WorkflowEvent["type"]) => (find(events, type)?.payload ?? null) as T | null;
// Compact trace only: payloads (including handoff forwarded_context) never leave the server.
const steps = (events: WorkflowEvent[]) => events.map((e) => ({ seq: e.seq, type: e.type, step_id: e.step_id, agent_id: e.agent_id }));
const safeFailure = (f: FailurePayload | null) => (f ? { code: typeof f.code === "string" ? f.code : "workflow_failed", message: typeof f.message === "string" ? f.message : "The workflow could not complete safely." } : null);
// Last agent_failed event: names the agent where the workflow actually stopped.
function failedAgent(events: WorkflowEvent[]) {
  const e = [...events].reverse().find((x) => x.type === "agent_failed");
  if (!e?.agent_id) return null;
  const p = (e.payload ?? null) as FailurePayload | null;
  return { agent_id: e.agent_id, label: AGENT_LABELS[e.agent_id] ?? e.agent_id, message: typeof p?.message === "string" ? p.message : null };
}
const withFailedAgent = (failure: ReturnType<typeof safeFailure>, agent: ReturnType<typeof failedAgent>) => (failure && agent ? { ...failure, failed_agent: agent.agent_id } : failure);
const stoppedAt = (agent: NonNullable<ReturnType<typeof failedAgent>>, fallback: string) => `Pegas stopped at the ${agent.label} (${agent.message ?? fallback}).`;
const text = (lines: Array<string | null | undefined | false>) => [{ type: "text" as const, text: lines.filter((l): l is string => typeof l === "string" && l.length > 0).slice(0, 15).join("\n") }];
const errorResult = (message: string, structured: Record<string, unknown> = {}): McpToolResult => ({ content: text([message]), structuredContent: { channel: "mcp", error: message, ...structured }, isError: true });

// ---------- submit_request (standard, free) ----------

export async function runStandardForMcp(args: { message: string; agentName?: string } & RunOptions): Promise<McpToolResult> {
  const caller = { declared_name: sanitizeAgentName(args.agentName), verified: false };
  const { events, emit } = collector(args.progress);
  await runWorkflow(args.message, emit, args.signal);
  const card = payloadOf<FinalRequestCard>(events, "workflow_completed");
  const agent = failedAgent(events);
  const failure = withFailedAgent(safeFailure(payloadOf<FailurePayload>(events, "workflow_failed")), agent);
  const structured = {
    channel: "mcp", scenario: "standard", caller, run_id: card?.run_id ?? events[0]?.run_id ?? null,
    outcome: card?.outcome ?? "failed", department: card?.department ?? null, priority: card?.priority ?? null, summary: card?.summary ?? null,
    next_action: card?.next_action ?? null, route_explanation: card?.route_explanation ?? null, review_status: card?.review_status ?? null,
    clarification_question: card?.clarification_question ?? null, failure, steps: steps(events), spending: "none",
  };
  if (!card) {
    const message = failure?.message ?? "The workflow ended without a result.";
    return { content: text([agent ? stoppedAt(agent, message) : `Pegas could not complete the request: ${message}`, "No payment was involved."]), structuredContent: structured, isError: true };
  }
  return {
    content: text([
      `Pegas Request Desk outcome: ${card.outcome}.`,
      card.department && `Department: ${card.department}${card.priority ? ` (priority ${card.priority})` : ""}.`,
      card.summary && `Summary: ${card.summary}`,
      card.next_action && `Next action: ${card.next_action}`,
      card.clarification_question && `Clarification needed: ${card.clarification_question}`,
      `Review status: ${card.review_status}.`,
      "Free standard flow; nothing was spent.",
    ]),
    structuredContent: structured,
  };
}

// ---------- request_legal_consultation (paid) ----------

const DELEGATION_CHAIN = [
  { role: "principal", label: "External agent via MCP", identity: "self-declared, not verified" },
  { role: "acting_agent", label: "Pegas Routing Agent", agent_id: "pegas:routing-agent:v1", identity: "registered (KYA-lite)" },
  { role: "counterparty", label: "Legal Advisor", agent_id: "pegas:legal-advisor:v1", identity: "registered seller (KYA-lite)" },
];
const AUTHORITY_NOTE = "Each link can only narrow authority. The external agent holds no keys and cannot change price, seller, network, asset or count.";

type PaymentSummary = {
  policy_decision: "approved" | "declined" | null; auth_passed: number | null; auth_total: number | null;
  mandate_id: string | null; mandate_state: string | null; amount: string; network: string;
  transaction_signature: string | null; explorer_url: string | null; confirmation_status: string | null; transfer_matches_offer: boolean | null;
  evidence_provider: string | null;
};

function buildPayment(events: WorkflowEvent[], storedEvidence: PublicAgenticPaymentEvidence | null): PaymentSummary | null {
  const failedConsultation = payloadOf<{ evidence?: PublicAgenticPaymentEvidence }>(events, "consultation_failed");
  const evidence = storedEvidence ?? failedConsultation?.evidence ?? null;
  const requested = !!find(events, "consultation_requested");
  if (!evidence && !requested) return null; // Routing did not select Legal: no payment capability was invoked.
  const mandate = payloadOf<{ mandate_id?: string; state?: string }>(events, "mandate_created");
  const policy = payloadOf<MandatePolicyDecision>(events, "mandate_policy_checked");
  const confirmed = payloadOf<{ transaction_signature?: string; explorer_url?: string; status?: string; transfer_matches_offer?: boolean }>(events, "payment_confirmed");
  const settled = payloadOf<{ transaction_signature?: string }>(events, "payment_settled");
  const pending = payloadOf<{ transaction_signature?: string | null }>(events, "payment_confirmation_pending");
  const controls = evidence?.policy.controls ?? policy?.controls ?? null;
  return {
    policy_decision: evidence?.policy.decision ?? policy?.decision ?? null,
    auth_passed: controls ? controls.filter((c) => c.passed).length : null,
    auth_total: controls ? controls.length : null,
    mandate_id: evidence?.authority.mandate_id ?? mandate?.mandate_id ?? null,
    mandate_state: find(events, "mandate_consumed") ? "consumed" : evidence?.authority.state ?? mandate?.state ?? null,
    amount: AMOUNT, network: NETWORK,
    transaction_signature: evidence?.settlement.transaction_signature ?? confirmed?.transaction_signature ?? settled?.transaction_signature ?? pending?.transaction_signature ?? null,
    explorer_url: evidence?.settlement.explorer_url ?? confirmed?.explorer_url ?? null,
    confirmation_status: evidence?.settlement.confirmation_status ?? confirmed?.status ?? (pending ? "pending" : null),
    transfer_matches_offer: evidence?.settlement.transfer_matches_offer ?? confirmed?.transfer_matches_offer ?? null,
    evidence_provider: evidence?.settlement.evidence_provider ?? null,
  };
}

function buildLegal(events: WorkflowEvent[], card: FinalRequestCard | null) {
  if (card?.legal_consultation) return { advisory: card.legal_consultation.advisory, disclaimer: card.legal_consultation.disclaimer };
  // Reviewer can fail after a delivered Legal advisory: keep it.
  const completed = payloadOf<{ disclaimer?: string }>(events, "consultation_completed");
  const advisory = events.find((e) => e.type === "agent_completed" && e.agent_id === "legal_advisor_agent")?.payload as LegalAdvisory | undefined;
  return completed && advisory ? { advisory, disclaimer: completed.disclaimer ?? null } : null;
}

function paymentLines(payment: PaymentSummary | null, events: WorkflowEvent[], failureCode: string | null) {
  if (!payment) {
    if (find(events, "consultation_skipped")) return ["Routing did not select Legal; no payment capability was invoked."];
    if (find(events, "workflow_failed") && !find(events, "consultation_requested")) return ["The workflow stopped before the payment step. Nothing was signed or spent."];
    return [];
  }
  const confirmed = payment.confirmation_status === "confirmed" || payment.confirmation_status === "finalized";
  const auth = payment.auth_total !== null ? ` (${payment.auth_passed}/${payment.auth_total} AUTH controls passed)` : "";
  if (find(events, "payment_declined") || failureCode === "payment_declined") return [`Payment declined by deterministic policy. Nothing was signed.${auth}`];
  if (failureCode === "legal_delivery_failed") return ["Payment confirmed on-chain; Legal delivery failed. No second payment will be attempted.", payment.explorer_url && `Transaction: ${payment.explorer_url}`];
  if (find(events, "payment_outcome_unknown")) return ["Payment outcome unknown; Pegas will not re-sign. Check later with get_payment_evidence."];
  if (find(events, "payment_confirmation_pending")) return ["Payment settled, independent confirmation pending. No second payment will be attempted. Check later with get_payment_evidence."];
  if (confirmed) return [`Payment confirmed on-chain: ${AMOUNT} on ${NETWORK}${auth}.`, payment.explorer_url && `Transaction: ${payment.explorer_url}`];
  if (failureCode === "payment_failed" || failureCode === "payment_unavailable") return ["Payment could not be completed or proven safely. No second payment will be attempted."];
  return [`Payment status: ${payment.confirmation_status ?? "not settled"}${auth}.`];
}

function buildPaidResult(args: { caller: Record<string, unknown>; runId: string; operationId: string; replayed: boolean; events: WorkflowEvent[]; card: FinalRequestCard | null }): McpToolResult {
  const { events, card } = args;
  const agent = failedAgent(events);
  const failure = withFailedAgent(safeFailure(payloadOf<FailurePayload>(events, "workflow_failed")), agent);
  const payment = buildPayment(events, card?.agentic_payment_evidence ?? null);
  const legal = buildLegal(events, card);
  const structured = {
    channel: "mcp", scenario: "paid_legal", caller: args.caller, delegation_chain: DELEGATION_CHAIN, authority_note: AUTHORITY_NOTE,
    run_id: args.runId, operation_id: args.operationId, replayed: args.replayed,
    outcome: card?.outcome ?? "failed", summary: card?.summary ?? null, review_status: card?.review_status ?? null,
    clarification_question: card?.clarification_question ?? null, failure, legal_consultation: legal, payment, steps: steps(events),
  };
  const spent = !!find(events, "payment_settled") || !!find(events, "payment_confirmed") || (args.replayed && !!card?.agentic_payment_evidence?.settlement.transaction_signature);
  const lines = [
    args.replayed ? "Replayed stored result. No new payment was made." : null,
    card ? `Pegas outcome: ${card.outcome} (${card.review_status}).` : agent ? stoppedAt(agent, failure?.message ?? "no result") : `Pegas could not complete the paid workflow: ${failure?.message ?? "no result."}`,
    ...paymentLines(payment, events, failure?.code ?? null),
    legal && `Legal advisory (${legal.advisory.verdict}): ${legal.advisory.summary}`,
    legal && failure && "Legal advisory was delivered; a later step failed.",
    card?.clarification_question && `Clarification needed: ${card.clarification_question}`,
    `Operation: ${args.operationId}`,
    spent && "Spent under Pegas' own bounded mandate (test USDC only); the caller held no payment authority.",
  ];
  return { content: text(lines), structuredContent: structured, ...(card ? {} : { isError: true }) };
}

export async function runPaidLegalForMcp(args: { message: string; agentName?: string; requestId?: string } & RunOptions): Promise<McpToolResult> {
  const caller = { declared_name: sanitizeAgentName(args.agentName), verified: false };
  const [{ validatePaymentConfig }, { PaymentLedger }, { runPaidWorkflow }] = await Promise.all([import("../payments/config"), import("../payments/store"), import("../workflow/paid-orchestrator")]);
  const checked = validatePaymentConfig();
  if (!checked.ok) return errorResult("Paid consultation is not configured.", { scenario: "paid_legal", caller });
  const ledger = new PaymentLedger(checked.config);
  const closed = "Paid ledger unavailable; failing closed before any model or payment call.";
  try { if (!(await ledger.ping())) return errorResult(closed, { scenario: "paid_legal", caller }); } catch { return errorResult(closed, { scenario: "paid_legal", caller }); }
  const requestId = args.requestId ?? crypto.randomUUID();
  const runId = crypto.randomUUID();
  const operationId = `op_${crypto.randomUUID()}`;
  const admission = await ledger.admit({ sessionScope: MCP_SESSION_SCOPE, clientRequestId: requestId, message: args.message, runId, operationId }).catch(() => null);
  if (!admission) return errorResult("Paid operation admission failed closed.", { scenario: "paid_legal", caller });
  if (admission.kind === "conflict") return errorResult("request_id was already used with different input.", { scenario: "paid_legal", caller, request_id: requestId });
  if (admission.kind === "existing") {
    const record = admission.record;
    if (record?.workflow_result) return buildPaidResult({ caller, runId: record.run_id, operationId: record.operation_id, replayed: true, events: [], card: record.workflow_result as FinalRequestCard });
    return errorResult("This paid operation already exists and will not be re-run or re-authorized.", { scenario: "paid_legal", caller, operation_id: record?.operation_id ?? null });
  }
  const { events, emit } = collector(args.progress);
  await runPaidWorkflow({ rawMessage: args.message, runId, operationId, sessionScope: MCP_SESSION_SCOPE, absoluteDeadline: Date.now() + 170_000, emitExternal: emit, signal: args.signal, origin: { channel: "mcp" } });
  return buildPaidResult({ caller, runId, operationId, replayed: false, events, card: payloadOf<FinalRequestCard>(events, "workflow_completed") });
}

// ---------- get_payment_evidence (read-only) ----------

export async function readPaymentEvidenceForMcp(operationId: string): Promise<McpToolResult> {
  const [{ readPaymentConfig, validatePaymentConfig }, { PaymentLedger, sha256 }] = await Promise.all([import("../payments/config"), import("../payments/store")]);
  const checked = validatePaymentConfig(readPaymentConfig(), { requireEnabled: false });
  if (!checked.ok) return errorResult("Payment evidence is not available.", { operation_id: operationId });
  const ledger = new PaymentLedger(checked.config);
  const allowed = await ledger.allowReceiptRecheck(MCP_SESSION_SCOPE).catch(() => false);
  if (!allowed) return errorResult("Rate limit reached for payment evidence lookups. Try again in a minute.", { operation_id: operationId });
  const op = await ledger.get(operationId).catch(() => null);
  // MCP callers can only read operations admitted through the MCP lane.
  if (!op || op.session_scope_hash !== sha256(MCP_SESSION_SCOPE)) return errorResult("Operation not found.", { operation_id: operationId, found: false });
  const s = op.evidence?.settlement;
  return {
    content: text([
      `Operation ${op.operation_id}: state ${op.state}.`,
      op.evidence ? `Policy decision: ${op.evidence.policy.decision}; mandate ${op.evidence.authority.state}.` : "No payment evidence was recorded for this operation.",
      s && `Settlement: ${s.confirmation_status}${s.transaction_signature ? `, tx ${s.transaction_signature}` : ""}.`,
      s?.explorer_url && `Explorer: ${s.explorer_url}`,
      "Stored evidence only; no chain recheck was performed.",
    ]),
    structuredContent: { operation_id: op.operation_id, state: op.state, evidence: op.evidence },
  };
}
