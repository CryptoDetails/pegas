import { runStructuredModel, StructuredModelError } from "../ollama";
import { decideReviewPath } from "./correction";
import { createEventFactory, type EventEmitter } from "./events";
import {
  BUSINESS_SYSTEM_PROMPT,
  departmentRevisionPrompt,
  FINANCE_SYSTEM_PROMPT,
  INTAKE_SYSTEM_PROMPT,
  REVIEWER_SYSTEM_PROMPT,
  TECHNICAL_SYSTEM_PROMPT,
  wrapAgentInput,
} from "./prompts";
import {
  departmentSchema,
  intakeSchema,
  reviewSchema,
  validateDepartment,
  validateIntake,
  validateReview,
  type ValidationResult,
} from "./schemas";
import { sanitizeRequest } from "./sanitize";
import type {
  AgentId,
  Department,
  DepartmentProposal,
  FinalRequestCard,
  IntakeAssessment,
  ReviewDecision,
  WorkflowEvent,
} from "./types";

const WORKFLOW_DEADLINE_MS = 180_000;
const MODEL_ATTEMPT_MS = 120_000;
const MAX_LLM_ATTEMPTS = 10;
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
    backend_response_received: error instanceof WorkflowError ? error.backendResponseReceived : false,
    validation_detail: error instanceof WorkflowError ? error.validationDetail : null,
  };
}

function departmentAgentId(department: Department): AgentId {
  return `${department}_agent` as AgentId;
}

function departmentPrompt(department: Department) {
  return department === "technical"
    ? TECHNICAL_SYSTEM_PROMPT
    : department === "business"
      ? BUSINESS_SYSTEM_PROMPT
      : FINANCE_SYSTEM_PROMPT;
}

function isClearlyUnderspecifiedRequest(message: string) {
  const text = message.toLowerCase();
  const vague = /\b(needs? help|need help|an issue|some issue|a problem|some problem|please route|right team|who should handle|which team)\b/.test(text);
  const concreteSignal = /\b(api|endpoint|http|401|403|500|integration|bug|error|technical|developer|sdk|webhook|campaign|marketing|partnership|partner launch|business|sales|invoice|billing|charge|payment|finance|refund)\b/.test(text);
  return vague && !concreteSignal;
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

  async function callAgent<T>(args: {
    agentId: AgentId;
    systemPrompt: string;
    context: Record<string, unknown>;
    schema: unknown;
    validator: (v: unknown) => ValidationResult<T>;
  }) {
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
            throw new WorkflowError("invalid_model_output", error.backendResponseReceived, `${args.agentId}: ${lastValidationReason}`);
          }
          if (error.code === "MODEL_OFFLINE") throw new WorkflowError("model_offline", error.backendResponseReceived);
          if (error.code === "MODEL_TIMEOUT") throw new WorkflowError("model_timeout", error.backendResponseReceived);
          throw new WorkflowError("model_error", error.backendResponseReceived);
        }
        throw error;
      }
    }
  }

  async function callDepartment(
    department: Department,
    context: Record<string, unknown>,
    revision: boolean,
  ): Promise<DepartmentProposal> {
    const agentId = departmentAgentId(department);
    emit("agent_started", department, agentId, { role: department, correction_cycle: revision ? 1 : 0 });
    try {
      const proposal = await callAgent({
        agentId,
        systemPrompt: revision ? departmentRevisionPrompt(department) : departmentPrompt(department),
        context,
        schema: departmentSchema,
        validator: (v) => validateDepartment(v, context.sanitized_request as string, department),
      });
      emit("agent_completed", department, agentId, proposal);
      return proposal;
    } catch (error) {
      emit("agent_failed", department, agentId, safeErrorPayload(error));
      throw error;
    }
  }

  async function callReviewer(
    context: Record<string, unknown>,
    pass: 1 | 2,
  ): Promise<ReviewDecision> {
    emit("agent_started", "reviewer", "reviewer_agent", { role: "Reviewer", pass });
    try {
      const review = await callAgent({
        agentId: "reviewer_agent",
        systemPrompt: REVIEWER_SYSTEM_PROMPT,
        context,
        schema: reviewSchema,
        validator: (v) => validateReview(v, context.sanitized_request as string),
      });
      emit("review_completed", "reviewer", "reviewer_agent", { ...review, pass });
      return review;
    } catch (error) {
      emit("agent_failed", "reviewer", "reviewer_agent", safeErrorPayload(error));
      throw error;
    }
  }

  function manualCard(intake: IntakeAssessment, reason: string): FinalRequestCard {
    const department = intake.department_candidate === "unknown" ? null : intake.department_candidate;
    return {
      run_id: runId,
      outcome: "manual_review",
      department,
      initial_department: department,
      revision_count: 0,
      priority: intake.priority,
      confidentiality: intake.confidentiality,
      summary: intake.summary,
      department_note: null,
      next_action: null,
      route_explanation: reason,
      review_status: "manual_review",
      clarification_question: intake.clarification_question,
    };
  }

  function proposalCard(args: {
    outcome: FinalRequestCard["outcome"];
    proposal: DepartmentProposal;
    initialDepartment: Department;
    revisionCount: 0 | 1;
    routeExplanation: string;
    reviewStatus: string;
    clarificationQuestion?: string | null;
  }): FinalRequestCard {
    return {
      run_id: runId,
      outcome: args.outcome,
      department: args.proposal.department,
      initial_department: args.initialDepartment,
      revision_count: args.revisionCount,
      priority: args.proposal.priority,
      confidentiality: args.proposal.confidentiality,
      summary: args.proposal.summary,
      department_note: args.proposal.department_note,
      next_action: args.outcome === "needs_information" ? null : args.proposal.next_action,
      route_explanation: args.routeExplanation,
      review_status: args.reviewStatus,
      clarification_question: args.clarificationQuestion ?? null,
    };
  }

  try {
    const sanitized = sanitizeRequest(rawMessage);
    emit("workflow_started", "workflow", null, { status: "running" });
    emit("input_checked", "input", null, {
      character_count: sanitized.sanitized.length,
      sensitivity_flag_types: sanitized.flagTypes,
      confidentiality_floor: sanitized.confidentialityFloor,
    });

    if (sanitized.flagTypes.length > 0) {
      const reason = "Credential-like material was detected and redacted. This request stops for manual review before any model call.";
      emit("routing_decision", "routing", null, { decision: "manual_review", reason, sensitivity_flag_types: sanitized.flagTypes });
      emit("agent_skipped", "intake", "intake_agent", { reason: "Sensitive input was stopped before model processing." });
      for (const dept of ["technical", "business", "finance"] as const) {
        emit("agent_skipped", dept, departmentAgentId(dept), { reason: "Sensitive request stopped before department routing." });
      }
      emit("agent_skipped", "reviewer", "reviewer_agent", { reason: "No department proposal was created." });
      const card: FinalRequestCard = {
        run_id: runId,
        outcome: "manual_review",
        department: null,
        initial_department: null,
        revision_count: 0,
        priority: null,
        confidentiality: "restricted",
        summary: "Sensitive request detected before model processing.",
        department_note: null,
        next_action: null,
        route_explanation: reason,
        review_status: "manual_review",
        clarification_question: null,
      };
      emit("workflow_completed", "workflow", null, card);
      return;
    }

    emit("agent_started", "intake", "intake_agent", { role: "Intake" });
    const intakeContext = {
      sanitized_request: sanitized.sanitized,
      confidentiality_floor: sanitized.confidentialityFloor,
    };
    let intake: IntakeAssessment;
    try {
      intake = await callAgent({
        agentId: "intake_agent",
        systemPrompt: INTAKE_SYSTEM_PROMPT,
        context: intakeContext,
        schema: intakeSchema,
        validator: (v) => validateIntake(v, sanitized.sanitized),
      });
    } catch (error) {
      emit("agent_failed", "intake", "intake_agent", safeErrorPayload(error));
      throw error;
    }
    emit("agent_completed", "intake", "intake_agent", intake);

    if (intake.privacy_review_needed || intake.confidentiality !== "internal") {
      const reason = "Sensitive or restricted requests are not auto-forwarded to a department.";
      emit("routing_decision", "routing", "intake_agent", { decision: "manual_review", reason });
      for (const dept of ["technical", "business", "finance"] as const) {
        emit("agent_skipped", dept, departmentAgentId(dept), { reason: "Sensitive request stopped before department routing." });
      }
      emit("agent_skipped", "reviewer", "reviewer_agent", { reason: "No department proposal was created." });
      emit("workflow_completed", "workflow", null, manualCard(intake, reason));
      return;
    }

    const deterministicNeedsInformation = isClearlyUnderspecifiedRequest(sanitized.sanitized);
    if (intake.department_candidate === "unknown" || intake.clarification_question || deterministicNeedsInformation) {
      const question = deterministicNeedsInformation
        ? "What is the request actually about: a technical/integration issue, a business/partnership matter, or a billing/finance issue?"
        : intake.clarification_question ?? "Which team should own this request: Technical, Business, or Finance?";
      const needsInfoReason = deterministicNeedsInformation
        ? "The request is too vague to route safely from the available information."
        : intake.route_reason;
      emit("routing_decision", "routing", "intake_agent", { decision: "needs_information", reason: needsInfoReason });
      for (const dept of ["technical", "business", "finance"] as const) {
        emit("agent_skipped", dept, departmentAgentId(dept), { reason: "Routing needs clarification." });
      }
      emit("agent_skipped", "reviewer", "reviewer_agent", { reason: "No department proposal was created." });
      const card: FinalRequestCard = {
        run_id: runId,
        outcome: "needs_information",
        department: null,
        initial_department: null,
        revision_count: 0,
        priority: intake.priority,
        confidentiality: intake.confidentiality,
        summary: intake.summary,
        department_note: null,
        next_action: null,
        route_explanation: needsInfoReason,
        review_status: "not_run",
        clarification_question: question,
      };
      emit("workflow_completed", "workflow", null, card);
      return;
    }

    const initialDepartment = intake.department_candidate;
    emit("routing_decision", "routing", "intake_agent", {
      decision: "route",
      department: initialDepartment,
      reason: intake.route_reason,
    });
    for (const dept of ["technical", "business", "finance"] as const) {
      if (dept !== initialDepartment) {
        emit("agent_skipped", dept, departmentAgentId(dept), { reason: `Intake selected ${initialDepartment}.` });
      }
    }

    const firstDepartmentContext: Record<string, unknown> = {
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
      handoff_id: crypto.randomUUID(),
      run_id: runId,
      source_step_id: "intake",
      target_step_id: initialDepartment,
      source_agent_id: "intake_agent",
      target_agent_id: departmentAgentId(initialDepartment),
      reason: intake.route_reason,
      forwarded_context: firstDepartmentContext,
      withheld_field_names: ["raw_request"],
      created_at: new Date().toISOString(),
    });

    let currentDepartment = initialDepartment;
    let proposal = await callDepartment(currentDepartment, firstDepartmentContext, false);

    if (proposal.confidentiality !== "internal") {
      const reason = "Department proposal raised confidentiality above internal, so manual review is required before Reviewer correction logic.";
      emit("policy_checked", "policy", null, { passed: false, reason });
      emit("agent_skipped", "reviewer", "reviewer_agent", { reason: "Sensitivity policy stopped the workflow before review." });
      emit("workflow_completed", "workflow", null, proposalCard({
        outcome: "manual_review",
        proposal,
        initialDepartment,
        revisionCount: 0,
        routeExplanation: reason,
        reviewStatus: "manual_review",
      }));
      return;
    }

    const firstReviewerContext: Record<string, unknown> = {
      sanitized_request: sanitized.sanitized,
      intake,
      department_proposal: proposal,
      correction_cycle: 0,
    };
    emit("handoff_created", "handoff-department-reviewer", departmentAgentId(currentDepartment), {
      handoff_id: crypto.randomUUID(),
      run_id: runId,
      source_step_id: currentDepartment,
      target_step_id: "reviewer",
      source_agent_id: departmentAgentId(currentDepartment),
      target_agent_id: "reviewer_agent",
      reason: "Review selected department proposal against source request and routing constraints.",
      forwarded_context: firstReviewerContext,
      withheld_field_names: ["raw_request"],
      created_at: new Date().toISOString(),
    });

    const review1 = await callReviewer(firstReviewerContext, 1);
    const firstDecision = decideReviewPath({
      review: review1,
      currentDepartment,
      proposal,
      correctionCycleUsed: false,
    });

    if (firstDecision.action === "approve") {
      emit("policy_checked", "policy", null, {
        passed: true,
        checks: ["single_department", "internal_confidentiality", "reviewer_approved"],
      });
      emit("workflow_completed", "workflow", null, proposalCard({
        outcome: "routed_demo",
        proposal,
        initialDepartment,
        revisionCount: 0,
        routeExplanation: intake.route_reason,
        reviewStatus: "approved",
      }));
      return;
    }

    if (firstDecision.action === "needs_information") {
      const question = review1.correction_request ?? proposal.open_questions[0] ?? intake.clarification_question ?? "What additional information should the team use to complete this request?";
      emit("workflow_completed", "workflow", null, proposalCard({
        outcome: "needs_information",
        proposal,
        initialDepartment,
        revisionCount: 0,
        routeExplanation: intake.route_reason,
        reviewStatus: "needs_information",
        clarificationQuestion: question,
      }));
      return;
    }

    if (firstDecision.action === "manual_review") {
      emit("policy_checked", "policy", null, { passed: false, reason: firstDecision.reason });
      emit("workflow_completed", "workflow", null, proposalCard({
        outcome: "manual_review",
        proposal,
        initialDepartment,
        revisionCount: 0,
        routeExplanation: firstDecision.reason,
        reviewStatus: review1.decision,
        clarificationQuestion: review1.correction_request,
      }));
      return;
    }

    const mode = firstDecision.action === "reroute" ? "reroute" : "same_department";
    const targetDepartment = firstDecision.target_department;
    emit("revision_requested", "correction", "reviewer_agent", {
      cycle: 1,
      mode,
      from_department: currentDepartment,
      target_department: targetDepartment,
      reason: review1.reason,
      issues: review1.issues,
    });

    const correctionContext: Record<string, unknown> = {
      sanitized_request: sanitized.sanitized,
      intake,
      previous_department_proposal: proposal,
      reviewer_issues: review1.issues,
      reviewer_reason: review1.reason,
      correction_request: review1.correction_request,
      target_department: targetDepartment,
      correction_cycle: 1,
    };

    emit("correction_started", "correction", departmentAgentId(targetDepartment), {
      cycle: 1,
      mode,
      from_department: currentDepartment,
      target_department: targetDepartment,
    });
    emit("handoff_created", "handoff-reviewer-department", "reviewer_agent", {
      handoff_id: crypto.randomUUID(),
      run_id: runId,
      source_step_id: "reviewer",
      target_step_id: targetDepartment,
      source_agent_id: "reviewer_agent",
      target_agent_id: departmentAgentId(targetDepartment),
      reason: review1.correction_request ?? review1.reason,
      forwarded_context: correctionContext,
      withheld_field_names: ["raw_request"],
      created_at: new Date().toISOString(),
    });

    currentDepartment = targetDepartment;
    proposal = await callDepartment(currentDepartment, correctionContext, true);
    emit("correction_completed", "correction", departmentAgentId(currentDepartment), {
      cycle: 1,
      mode,
      department: currentDepartment,
    });

    if (proposal.confidentiality !== "internal") {
      const reason = "The corrected department proposal raised confidentiality above internal, so manual review is required.";
      emit("policy_checked", "policy", null, { passed: false, reason });
      emit("agent_skipped", "reviewer", "reviewer_agent", { reason: "Sensitivity policy stopped Reviewer #2." });
      emit("workflow_completed", "workflow", null, proposalCard({
        outcome: "manual_review",
        proposal,
        initialDepartment,
        revisionCount: 1,
        routeExplanation: reason,
        reviewStatus: "manual_review_after_correction",
      }));
      return;
    }

    const secondReviewerContext: Record<string, unknown> = {
      sanitized_request: sanitized.sanitized,
      intake,
      department_proposal: proposal,
      previous_department_proposal: correctionContext.previous_department_proposal,
      reviewer_1: review1,
      correction_mode: mode,
      correction_cycle: 1,
    };
    emit("handoff_created", "handoff-department-reviewer-2", departmentAgentId(currentDepartment), {
      handoff_id: crypto.randomUUID(),
      run_id: runId,
      source_step_id: currentDepartment,
      target_step_id: "reviewer",
      source_agent_id: departmentAgentId(currentDepartment),
      target_agent_id: "reviewer_agent",
      reason: "Review the corrected proposal. This second reviewer pass is terminal.",
      forwarded_context: secondReviewerContext,
      withheld_field_names: ["raw_request"],
      created_at: new Date().toISOString(),
    });

    const review2 = await callReviewer(secondReviewerContext, 2);
    const secondDecision = decideReviewPath({
      review: review2,
      currentDepartment,
      proposal,
      correctionCycleUsed: true,
    });

    if (secondDecision.action === "approve") {
      emit("policy_checked", "policy", null, {
        passed: true,
        checks: ["single_correction_cycle", "internal_confidentiality", "reviewer_2_approved"],
      });
      emit("workflow_completed", "workflow", null, proposalCard({
        outcome: "routed_demo",
        proposal,
        initialDepartment,
        revisionCount: 1,
        routeExplanation: intake.route_reason,
        reviewStatus: mode === "reroute" ? "approved_after_reroute" : "approved_after_revision",
      }));
      return;
    }

    if (secondDecision.action === "needs_information") {
      const question = review2.correction_request ?? proposal.open_questions[0] ?? "What additional information is needed to complete the corrected request?";
      emit("workflow_completed", "workflow", null, proposalCard({
        outcome: "needs_information",
        proposal,
        initialDepartment,
        revisionCount: 1,
        routeExplanation: "Reviewer #2 requested more information after the single correction cycle.",
        reviewStatus: "needs_information_after_correction",
        clarificationQuestion: question,
      }));
      return;
    }

    const terminalReason = secondDecision.action === "manual_review"
      ? secondDecision.reason
      : "The single reviewer correction cycle was exhausted.";
    emit("policy_checked", "policy", null, { passed: false, reason: terminalReason });
    emit("workflow_completed", "workflow", null, proposalCard({
      outcome: "manual_review",
      proposal,
      initialDepartment,
      revisionCount: 1,
      routeExplanation: terminalReason,
      reviewStatus: "manual_review_after_correction",
      clarificationQuestion: review2.correction_request,
    }));
  } catch (error) {
    emit("workflow_failed", "workflow", null, safeErrorPayload(error));
  }
}
