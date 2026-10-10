import type { Metadata } from "next";
import { buildReceiptHtml } from "@/lib/mcp/receipt-app";
import { ReceiptPreview } from "./ReceiptPreview";

// Review-only page: not linked from the navigation. Renders the MCP App receipt with mock tool results.
export const metadata: Metadata = {
  title: "Pegas receipt preview",
  robots: { index: false, follow: false },
};

const step = (seq: number, type: string, step_id: string, agent_id: string | null = null) => ({ seq, type, step_id, agent_id });

const CONTROLS = [
  ["AUTH-01", "Feature and mandate state"], ["AUTH-02", "Expiry and deadline reserve"], ["AUTH-03", "Service scope"],
  ["AUTH-04", "Registered counterparty"], ["AUTH-05", "Network allowlist"], ["AUTH-06", "Asset allowlist"],
  ["AUTH-07", "Amount ceiling"], ["AUTH-08", "Single authorization"], ["AUTH-09", "Request and privacy binding"],
  ["AUTH-10", "Budget and rate controls"],
].map(([id, label]) => ({ id, label, passed: true, public_reason: "" }));

const PAID_INPUT = { message: "Review this NDA clause before signing…", agent_name: "Claude" };
const CALLER = { declared_name: "Claude", verified: false };
const TX = "4tQzW1mJcKx8yNfP2eVq7rHs9aB3dLu6oGiT5kZnXyRwEjM1pCvD8sFhA2bQ7uYe";

const paidSuccess = {
  content: [{ type: "text", text: "Pegas outcome: routed_demo (approved)." }],
  structuredContent: {
    channel: "mcp", scenario: "paid_legal", caller: CALLER, run_id: "run_demo", operation_id: "op_00000000-0000-4000-8000-000000000001", replayed: false,
    outcome: "routed_demo", review_status: "approved", failure: null,
    legal_consultation: {
      advisory: {
        verdict: "human_review_required",
        summary: "The clause lets the vendor train AI models on your shared information and keep it for five years, which conflicts with the demo data-use policy. Ask to remove training rights and shorten retention.",
        findings: [], next_action: "Escalate to counsel.", open_questions: [],
      },
      disclaimer: "Demo policy assessment. Not legal advice or approval to sign.",
    },
    payment: {
      policy_decision: "approved", auth_passed: 10, auth_total: 10, mandate_id: "mdt_demo", mandate_state: "consumed",
      amount: "0.01 test USDC", network: "Solana Devnet", transaction_signature: TX,
      explorer_url: `https://explorer.solana.com/tx/${TX}?cluster=devnet`, confirmation_status: "finalized", transfer_matches_offer: true, evidence_provider: "alchemy",
    },
    steps: [
      step(1, "workflow_started", "workflow"), step(3, "agent_started", "intake", "intake_agent"), step(4, "agent_completed", "intake", "intake_agent"),
      step(6, "agent_completed", "privacy", "privacy_agent"), step(8, "agent_completed", "routing", "routing_agent"), step(9, "routing_decision", "routing", "routing_agent"),
      step(10, "consultation_requested", "payment"), step(11, "mandate_created", "payment"), step(12, "counterparty_verified", "payment"),
      step(13, "payment_required", "payment"), step(14, "mandate_policy_checked", "payment"), step(15, "payment_authorized", "payment"),
      step(16, "payment_settling", "payment"), step(17, "payment_settled", "payment"), step(18, "payment_confirmed", "payment"),
      step(19, "mandate_consumed", "payment"), step(21, "agent_completed", "legal", "legal_advisor_agent"), step(22, "consultation_completed", "legal"),
      step(24, "review_completed", "reviewer", "reviewer_agent"), step(25, "workflow_completed", "workflow"),
    ],
    final_card: { outcome: "routed_demo", agentic_payment_evidence: { policy: { decision: "approved", controls: CONTROLS } } },
  },
};

const standardSuccess = {
  content: [{ type: "text", text: "Pegas Request Desk outcome: routed_demo." }],
  structuredContent: {
    channel: "mcp", scenario: "standard", caller: { declared_name: "Cursor", verified: false }, run_id: "run_demo",
    outcome: "routed_demo", department: "technical", priority: "high", summary: "Partner API returns 401 after credential rotation.",
    next_action: "Ask the integration team to confirm the rotated test credentials are deployed to the partner sandbox and re-run the failing call.",
    review_status: "approved", clarification_question: null, failure: null, spending: "none",
    steps: [
      step(1, "workflow_started", "workflow"), step(4, "agent_completed", "intake", "intake_agent"), step(5, "agent_skipped", "privacy", "privacy_agent"),
      step(7, "agent_completed", "routing", "routing_agent"), step(8, "routing_decision", "routing", "routing_agent"), step(10, "review_completed", "reviewer", "reviewer_agent"),
      step(11, "workflow_completed", "workflow"),
    ],
    final_card: { outcome: "routed_demo", department: "technical" },
  },
};

const declined = {
  isError: true,
  content: [{ type: "text", text: "Payment declined by deterministic policy. Nothing was signed. (9/10 AUTH controls passed)" }],
  structuredContent: {
    channel: "mcp", scenario: "paid_legal", caller: CALLER, run_id: "run_demo", operation_id: "op_00000000-0000-4000-8000-000000000002", replayed: false,
    outcome: "failed", review_status: null, legal_consultation: null,
    failure: { code: "payment_declined", message: "The shared demo budget for external agents is used up for this hour. Pegas declined the payment before signing." },
    payment: {
      policy_decision: "declined", auth_passed: 9, auth_total: 10, mandate_id: "mdt_demo", mandate_state: "revoked",
      amount: "0.01 test USDC", network: "Solana Devnet", transaction_signature: null, explorer_url: null, confirmation_status: null, transfer_matches_offer: null, evidence_provider: null,
    },
    steps: [
      step(1, "workflow_started", "workflow"), step(4, "agent_completed", "intake", "intake_agent"), step(6, "agent_completed", "privacy", "privacy_agent"),
      step(8, "agent_completed", "routing", "routing_agent"), step(9, "routing_decision", "routing", "routing_agent"), step(10, "consultation_requested", "payment"),
      step(11, "mandate_created", "payment"), step(13, "payment_required", "payment"), step(14, "mandate_policy_checked", "payment"),
      step(15, "payment_declined", "payment"), step(16, "mandate_revoked", "payment"), step(17, "workflow_failed", "workflow"),
    ],
    final_card: null,
  },
};

const CASES = [
  { id: "paid", label: "Paid result · success", html: buildReceiptHtml("", { input: PAID_INPUT, result: paidSuccess }) },
  { id: "standard", label: "Standard result · success", html: buildReceiptHtml("", { input: { agent_name: "Cursor" }, result: standardSuccess }) },
  { id: "declined", label: "Paid result · declined", html: buildReceiptHtml("", { input: PAID_INPUT, result: declined }) },
  { id: "waiting", label: "Waiting (before the result)", html: buildReceiptHtml("", { input: PAID_INPUT, result: null }) },
];

export default function ReceiptPreviewPage() {
  return <ReceiptPreview cases={CASES} />;
}
