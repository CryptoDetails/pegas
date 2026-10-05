import type { PublicAgenticPaymentEvidence } from "../payments/types";

export type Department = "technical" | "business" | "finance";
export type PaidDepartment = Department | "legal";
export type WorkflowScenario = "standard" | "paid_legal";
export type Priority = "low" | "medium" | "high";
export type Confidentiality = "internal" | "confidential" | "restricted";

export type IntakeAssessment = {
  summary: string;
  request_type: string;
  department_candidate: Department | "unknown";
  priority: Priority;
  confidentiality: Confidentiality;
  privacy_review_needed: boolean;
  route_reason: string;
  evidence: string[];
  missing_information: string[];
  clarification_question: string | null;
};

export type PrivacyDecision = {
  decision: "continue" | "manual_review" | "needs_information";
  confidentiality: Confidentiality;
  safe_brief: string;
  reason: string;
  recipient_restrictions: string[];
  withheld_field_names: string[];
  evidence: string[];
  clarification_question: string | null;
};

export type RoutingDecision = {
  department: Department;
  summary: string;
  priority: Priority;
  confidentiality: Confidentiality;
  routing_reason: string;
  department_brief: string;
  next_action: string;
  open_questions: string[];
  evidence: string[];
};

export type ConsultationRequest = { service_id:"legal_consultation"; question:string; reason:string };
export type PaidRoutingDecision = Omit<RoutingDecision,"department"> & { department:PaidDepartment; consultation_request:ConsultationRequest|null };

export type ReviewDecision = {
  decision: "approved" | "revise" | "manual_review" | "needs_information";
  issues: string[];
  correction_target: Department | null;
  correction_request: string | null;
  reason: string;
  evidence: string[];
};
export type PaidReviewDecision = Omit<ReviewDecision,"correction_target"> & { correction_target:PaidDepartment|null };

export type LegalAdvisory = {
  verdict:"no_policy_issue_identified"|"human_review_required"|"needs_information";
  summary:string;
  findings:Array<{policy_id:"DL-01"|"DL-02"|"DL-03";observation:string;recommended_action:string}>;
  next_action:string;
  open_questions:string[];
};
export type LegalConsultationEnvelope={operation_id:string;policy_version:"pegas-demo-legal-v1";advisory:LegalAdvisory;disclaimer:"Demo policy assessment. Not legal advice or approval to sign."};

export type FinalRequestCard = {
  run_id: string;
  outcome: "routed_demo" | "manual_review" | "needs_information";
  department: Department | null;
  initial_department: Department | null;
  revision_count: 0 | 1;
  priority: Priority | null;
  confidentiality: Confidentiality | null;
  summary: string | null;
  department_note: string | null;
  next_action: string | null;
  route_explanation: string;
  review_status: string;
  clarification_question: string | null;
  scenario?: WorkflowScenario;
  paid_department?: PaidDepartment | null;
  initial_paid_department?: PaidDepartment | null;
  legal_consultation?: LegalConsultationEnvelope | null;
  agentic_payment_evidence?: PublicAgenticPaymentEvidence | null;
};

export type WorkflowEventType =
  | "workflow_started" | "input_checked" | "agent_started" | "agent_completed"
  | "agent_failed" | "agent_skipped" | "routing_decision" | "handoff_created"
  | "review_completed" | "revision_requested" | "correction_started" | "correction_completed"
  | "policy_checked" | "workflow_completed" | "workflow_failed" | "heartbeat"
  | "consultation_requested" | "consultation_skipped" | "mandate_created" | "counterparty_verified"
  | "payment_required" | "mandate_policy_checked" | "payment_authorized" | "payment_settling"
  | "payment_settled" | "payment_confirmation_pending" | "payment_confirmed" | "mandate_consumed"
  | "mandate_revoked" | "payment_declined" | "payment_failed" | "payment_outcome_unknown"
  | "consultation_completed" | "consultation_failed" | "consultation_reused";

export type WorkflowEvent = {
  event_version: 1;
  run_id: string;
  event_id: string;
  seq: number;
  type: WorkflowEventType;
  timestamp: string;
  step_id: string;
  agent_id: string | null;
  payload: unknown;
};

export type Handoff = {
  handoff_id: string;
  run_id: string;
  source_step_id: string;
  target_step_id: string;
  source_agent_id: string;
  target_agent_id: string;
  reason: string;
  forwarded_context: Record<string, unknown>;
  withheld_field_names: string[];
  created_at: string;
};

export type AgentId = "intake_agent" | "privacy_agent" | "routing_agent" | "reviewer_agent" | "legal_advisor_agent";
