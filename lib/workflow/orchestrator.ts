import { runStructuredModel, StructuredModelError } from "../ollama";
import { createEventFactory, type EventEmitter } from "./events";
import { BUSINESS_SYSTEM_PROMPT, FINANCE_SYSTEM_PROMPT, INTAKE_SYSTEM_PROMPT, REVIEWER_SYSTEM_PROMPT, TECHNICAL_SYSTEM_PROMPT, wrapAgentInput } from "./prompts";
import { departmentSchema, intakeSchema, reviewSchema, validateDepartment, validateIntake, validateReview, type ValidationResult } from "./schemas";
import { sanitizeRequest } from "./sanitize";
import type { AgentId, Department, DepartmentProposal, FinalRequestCard, IntakeAssessment, ReviewDecision, WorkflowEvent } from "./types";

const WORKFLOW_DEADLINE_MS = 180_000;
const MODEL_ATTEMPT_MS = 120_000;
const MAX_LLM_ATTEMPTS = 6;
const REPAIR_INSTRUCTION = "Your previous response failed the required structured contract. Return only the corrected schema object with every required key and no extra keys. Use empty strings for nullable model-facing fields when no value applies. Arrays may be empty. evidence may be [] and must never contain paraphrases; if used, every evidence item must be copied character-for-character from sanitized_request.";

class WorkflowError extends Error {
  constructor(
    public readonly code: "model_offline" | "model_timeout" | "invalid_model_output" | "workflow_deadline" | "call_budget" | "interrupted" | "model_error",
    public readonly backendResponseReceived = false,
    public readonly validationDetail: string | null = null,
  ) {
    super(code);
  }
}

function safeErrorPayload(error: unknown) {
  const code = error instanceof WorkflowError ? error.code : "model_error";
  const messages: Record<string, string> = {
    model_offline: "The model is currently unreachable.",
    model_timeout: "The model did not complete the request within the allowed time.",
    invalid_model_output: "The model backend responded, but the agent output still failed the structured contract after one repair attempt.",
    workflow_deadline: "The workflow reached its execution deadline.",
    call_budget: "The workflow reached its model-call budget.",
    interrupted: "The workflow was interrupted before completion.",
    model_error: "The workflow could not complete safely because of a model error.",
  };
  return {
    code,
    message: messages[code] ?? messages.model_error,
    backend_response_received:
      error instanceof WorkflowError ? error.backendResponseReceived : false,
    validation_detail:
      error instanceof WorkflowError ? error.validationDetail : null,
  };
}

function departmentAgentId(department: Department): AgentId {
  return `${department}_agent` as AgentId;
}
function departmentPrompt(department: Department) {
  return department === "technical" ? TECHNICAL_SYSTEM_PROMPT : department === "business" ? BUSINESS_SYSTEM_PROMPT : FINANCE_SYSTEM_PROMPT;
}

export async function runWorkflow(rawMessage: string, emitExternal: EventEmitter, signal?: AbortSignal) {
  const runId = crypto.randomUUID();
  const eventFactory = createEventFactory(runId);
  const startedAt = Date.now();
  let attempts = 0;

  const emit = (type: WorkflowEvent["type"], stepId: string, agentId: AgentId | null, payload: unknown) => {
    const event = eventFactory(type, stepId, agentId, payload);
    if (event) emitExternal(event);
  };
  const remainingMs = () => WORKFLOW_DEADLINE_MS - (Date.now() - startedAt);
  const assertRunActive = () => {
    if (signal?.aborted) throw new WorkflowError("interrupted");
    if (remainingMs() <= 0) throw new WorkflowError("workflow_deadline");
  };

  async function callAgent<T>(args: { agentId: AgentId; stepId: string; systemPrompt: string; context: Record<string, unknown>; schema: unknown; validator: (v: unknown) => ValidationResult<T>; }) {
    let repaired = false;
    let repairReason = "The response did not match the required contract.";

    while (true) {
      assertRunActive();
      if (attempts >= MAX_LLM_ATTEMPTS) throw new WorkflowError("call_budget");
      attempts += 1;

      let lastValidationReason = "The response did not match the required contract.";
      try {
        const repairInstruction = repaired
          ? `${REPAIR_INSTRUCTION} Specific validation issue: ${repairReason}`
          : null;
        const prompt = repairInstruction
          ? `${wrapAgentInput(args.context)}\n\n<SERVER_REPAIR_INSTRUCTION>${repairInstruction}</SERVER_REPAIR_INSTRUCTION>`
          : wrapAgentInput(args.context);

        return (await runStructuredModel({
          systemPrompt: args.systemPrompt,
          prompt,
          schema: args.schema,
          validator: (value) => {
            const result = args.validator(value);
            if (result.ok === false) {
              lastValidationReason = result.reason;
              return null;
            }
            return result.value;
          },
          signal,
          timeoutMs: Math.min(MODEL_ATTEMPT_MS, Math.max(1, remainingMs())),
          maxOutputTokens: 600,
        })).value;
      } catch (error) {
        if (error instanceof StructuredModelError && error.code === "INVALID_OUTPUT" && !repaired) {
          repaired = true;
          repairReason = lastValidationReason;
          continue;
        }
        if (error instanceof StructuredModelError) {
          if (error.code === "INVALID_OUTPUT") {
            throw new WorkflowError(
              "invalid_model_output",
              error.backendResponseReceived,
              `${args.agentId}: ${lastValidationReason}`,
            );
          }
          if (error.code === "MODEL_OFFLINE") throw new WorkflowError("model_offline", error.backendResponseReceived);
          if (error.code === "MODEL_TIMEOUT") throw new WorkflowError("model_timeout", error.backendResponseReceived);
          throw new WorkflowError("model_error", error.backendResponseReceived);
        }
        throw error;
      }
    }
  }

  function manualCard(intake: IntakeAssessment, reason: string): FinalRequestCard {
    return { run_id: runId, outcome: "manual_review", department: intake.department_candidate === "unknown" ? null : intake.department_candidate, priority: intake.priority, confidentiality: intake.confidentiality, summary: intake.summary, department_note: null, next_action: null, route_explanation: reason, review_status: "manual_review", clarification_question: intake.clarification_question };
  }

  try {
    const sanitized = sanitizeRequest(rawMessage);
    emit("workflow_started", "workflow", null, { status: "running" });
    emit("input_checked", "input", null, { character_count: sanitized.sanitized.length, sensitivity_flag_types: sanitized.flagTypes, confidentiality_floor: sanitized.confidentialityFloor });

    emit("agent_started", "intake", "intake_agent", { role: "Intake" });
    const intakeContext = { sanitized_request: sanitized.sanitized, confidentiality_floor: sanitized.confidentialityFloor };
    let intake: IntakeAssessment;
    try {
      intake = await callAgent({ agentId: "intake_agent", stepId: "intake", systemPrompt: INTAKE_SYSTEM_PROMPT, context: intakeContext, schema: intakeSchema, validator: (v) => validateIntake(v, sanitized.sanitized) });
    } catch (error) {
      emit("agent_failed", "intake", "intake_agent", safeErrorPayload(error)); throw error;
    }
    emit("agent_completed", "intake", "intake_agent", intake);

    const sensitiveStop = sanitized.flagTypes.length > 0 || intake.privacy_review_needed || intake.confidentiality !== "internal";
    if (sensitiveStop) {
      const reason = "Phase 1 does not auto-forward sensitive or restricted requests to a department.";
      emit("routing_decision", "routing", "intake_agent", { decision: "manual_review", reason });
      for (const dept of ["technical", "business", "finance"] as const) emit("agent_skipped", dept, departmentAgentId(dept), { reason: "Sensitive request stopped before department routing." });
      emit("agent_skipped", "reviewer", "reviewer_agent", { reason: "No department proposal was created." });
      emit("workflow_completed", "workflow", null, manualCard(intake, reason));
      return;
    }

    if (intake.department_candidate === "unknown" || intake.clarification_question) {
      const question = intake.clarification_question ?? "Which team should own this request: Technical, Business, or Finance?";
      emit("routing_decision", "routing", "intake_agent", { decision: "needs_information", reason: intake.route_reason });
      for (const dept of ["technical", "business", "finance"] as const) emit("agent_skipped", dept, departmentAgentId(dept), { reason: "Routing needs clarification." });
      emit("agent_skipped", "reviewer", "reviewer_agent", { reason: "No department proposal was created." });
      const card: FinalRequestCard = { run_id: runId, outcome: "needs_information", department: null, priority: intake.priority, confidentiality: intake.confidentiality, summary: intake.summary, department_note: null, next_action: null, route_explanation: intake.route_reason, review_status: "not_run", clarification_question: question };
      emit("workflow_completed", "workflow", null, card);
      return;
    }

    const selected = intake.department_candidate;
    emit("routing_decision", "routing", "intake_agent", { decision: "route", department: selected, reason: intake.route_reason });
    for (const dept of ["technical", "business", "finance"] as const) if (dept !== selected) emit("agent_skipped", dept, departmentAgentId(dept), { reason: `Intake selected ${selected}.` });

    const departmentContext: Record<string, unknown> = {
      request_summary: intake.summary,
      request_type: intake.request_type,
      priority: intake.priority,
      confidentiality: intake.confidentiality,
      route_reason: intake.route_reason,
      evidence: intake.evidence,
      missing_information: intake.missing_information,
      sanitized_request: sanitized.sanitized,
    };
    emit("handoff_created", "handoff-intake-department", "intake_agent", {
      handoff_id: crypto.randomUUID(), run_id: runId, source_step_id: "intake", target_step_id: selected, source_agent_id: "intake_agent", target_agent_id: departmentAgentId(selected), reason: intake.route_reason, forwarded_context: departmentContext, withheld_field_names: ["raw_request"], created_at: new Date().toISOString(),
    });

    const deptAgent = departmentAgentId(selected);
    emit("agent_started", selected, deptAgent, { role: selected });
    let proposal: DepartmentProposal;
    try {
      proposal = await callAgent({ agentId: deptAgent, stepId: selected, systemPrompt: departmentPrompt(selected), context: departmentContext, schema: departmentSchema, validator: (v) => validateDepartment(v, sanitized.sanitized, selected) });
    } catch (error) {
      emit("agent_failed", selected, deptAgent, safeErrorPayload(error)); throw error;
    }
    emit("agent_completed", selected, deptAgent, proposal);

    const reviewerContext: Record<string, unknown> = { sanitized_request: sanitized.sanitized, intake, department_proposal: proposal };
    emit("handoff_created", "handoff-department-reviewer", deptAgent, {
      handoff_id: crypto.randomUUID(), run_id: runId, source_step_id: selected, target_step_id: "reviewer", source_agent_id: deptAgent, target_agent_id: "reviewer_agent", reason: "Review selected department proposal against source request and routing constraints.", forwarded_context: reviewerContext, withheld_field_names: ["raw_request"], created_at: new Date().toISOString(),
    });
    emit("agent_started", "reviewer", "reviewer_agent", { role: "Reviewer" });
    let review: ReviewDecision;
    try {
      review = await callAgent({ agentId: "reviewer_agent", stepId: "reviewer", systemPrompt: REVIEWER_SYSTEM_PROMPT, context: reviewerContext, schema: reviewSchema, validator: (v) => validateReview(v, sanitized.sanitized) });
    } catch (error) {
      emit("agent_failed", "reviewer", "reviewer_agent", safeErrorPayload(error)); throw error;
    }
    emit("review_completed", "reviewer", "reviewer_agent", review);

    const sensitivityEscalated = proposal.confidentiality !== "internal";
    const rerouteRequested = review.correction_target !== null && review.correction_target !== selected;
    if (review.decision === "approved" && !sensitivityEscalated && !rerouteRequested) {
      emit("policy_checked", "policy", null, { passed: true, checks: ["single_department", "internal_confidentiality", "reviewer_approved"] });
      const card: FinalRequestCard = { run_id: runId, outcome: "routed_demo", department: selected, priority: proposal.priority, confidentiality: proposal.confidentiality, summary: proposal.summary, department_note: proposal.department_note, next_action: proposal.next_action, route_explanation: intake.route_reason, review_status: "approved", clarification_question: null };
      emit("workflow_completed", "workflow", null, card);
      return;
    }

    if (review.decision === "needs_information") {
      const question = review.correction_request ?? proposal.open_questions[0] ?? intake.clarification_question ?? "What additional information should the team use to complete this request?";
      const card: FinalRequestCard = { run_id: runId, outcome: "needs_information", department: selected, priority: proposal.priority, confidentiality: proposal.confidentiality, summary: proposal.summary, department_note: proposal.department_note, next_action: null, route_explanation: intake.route_reason, review_status: "needs_information", clarification_question: question };
      emit("workflow_completed", "workflow", null, card);
      return;
    }

    const manualReason = sensitivityEscalated ? "Department proposal raised confidentiality above internal." : rerouteRequested ? "Reviewer requested a different department; rerouting loops are reserved for Phase 2." : review.reason;
    emit("policy_checked", "policy", null, { passed: false, reason: manualReason });
    const card: FinalRequestCard = { run_id: runId, outcome: "manual_review", department: selected, priority: proposal.priority, confidentiality: proposal.confidentiality, summary: proposal.summary, department_note: proposal.department_note, next_action: proposal.next_action, route_explanation: manualReason, review_status: review.decision, clarification_question: review.correction_request };
    emit("workflow_completed", "workflow", null, card);
  } catch (error) {
    emit("workflow_failed", "workflow", null, safeErrorPayload(error));
  }
}
