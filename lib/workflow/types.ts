export type Department = "technical" | "business" | "finance";
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

export type DepartmentProposal = {
  department: Department;
  summary: string;
  priority: Priority;
  confidentiality: Confidentiality;
  department_note: string;
  next_action: string;
  open_questions: string[];
  evidence: string[];
};

export type ReviewDecision = {
  decision: "approved" | "revise" | "manual_review" | "needs_information";
  issues: string[];
  correction_target: Department | null;
  correction_request: string | null;
  reason: string;
  evidence: string[];
};

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
};

export type WorkflowEventType =
  | "workflow_started" | "input_checked" | "agent_started" | "agent_completed"
  | "agent_failed" | "agent_skipped" | "routing_decision" | "handoff_created"
  | "review_completed" | "revision_requested" | "correction_started" | "correction_completed"
  | "policy_checked" | "workflow_completed" | "workflow_failed" | "heartbeat";

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

export type AgentId = "intake_agent" | "privacy_agent" | "technical_agent" | "business_agent" | "finance_agent" | "reviewer_agent";
