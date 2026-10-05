import { runStructuredModel, StructuredModelError } from "../ollama";
import { decideReviewPath } from "./correction";
import { DEPARTMENT_PROFILES } from "./departments";
import { createEventFactory, type EventEmitter } from "./events";
import { INTAKE_SYSTEM_PROMPT, PRIVACY_SYSTEM_PROMPT, REVIEWER_SYSTEM_PROMPT, ROUTING_SYSTEM_PROMPT, routingRevisionPrompt, wrapAgentInput } from "./prompts";
import { intakeSchema, privacySchema, reviewSchema, routingSchema, validateIntake, validatePrivacy, validateReview, validateRouting, type ValidationResult } from "./schemas";
import { sanitizeRequest } from "./sanitize";
import { buildPrivacyRoutingContext, privacyTerminalDecision, shouldRunPrivacy } from "./privacy";
import type { AgentId, Department, FinalRequestCard, IntakeAssessment, PrivacyDecision, RoutingDecision, WorkflowEvent } from "./types";

const WORKFLOW_DEADLINE_MS = 180_000;
const MODEL_ATTEMPT_MS = 120_000;
const MAX_LLM_ATTEMPTS = 12;
const REPAIR_INSTRUCTION = "Your previous response failed the required structured contract. Return only the corrected schema object with every required key and no extra keys. Use empty strings for nullable model-facing fields when no value applies. Arrays may be empty. evidence may be [] and must never contain paraphrases; if used, every evidence item must be copied character-for-character from the allowed request text.";

class WorkflowError extends Error {
  constructor(public readonly code: "model_offline" | "model_timeout" | "invalid_model_output" | "workflow_deadline" | "call_budget" | "interrupted" | "model_error", public readonly backendResponseReceived = false, public readonly validationDetail: string | null = null) { super(code); }
}

function safeErrorPayload(error: unknown) {
  const code = error instanceof WorkflowError ? error.code : "model_error";
  const messages: Record<string, string> = {
    model_offline: "The model is currently unreachable.", model_timeout: "The model did not complete the request within the allowed time.", invalid_model_output: "The model backend responded, but the agent output still failed the structured contract after one repair attempt.", workflow_deadline: "The workflow reached its execution deadline.", call_budget: "The workflow reached its model-call budget.", interrupted: "The workflow was interrupted before completion.", model_error: "The workflow could not complete safely because of a model error.",
  };
  return { code, message: messages[code] ?? messages.model_error, backend_response_received: error instanceof WorkflowError ? error.backendResponseReceived : false, validation_detail: error instanceof WorkflowError ? error.validationDetail : null };
}

function evidenceSource(context: Record<string, unknown>) {
  return typeof context.sanitized_request === "string" ? context.sanitized_request : typeof context.safe_brief === "string" ? context.safe_brief : "";
}

function isClearlyUnderspecifiedRequest(message: string) {
  const text = message.toLowerCase();
  const vague = /\b(needs? help|need help|an issue|some issue|a problem|some problem|please route|right team|who should handle|which team)\b/.test(text);
  const concreteSignal = /\b(api|endpoint|http|401|403|500|integration|bug|error|technical|developer|sdk|webhook|campaign|marketing|partnership|partner launch|business|sales|invoice|billing|charge|payment|finance|refund|pricing|agreement|contract)\b/.test(text);
  return vague && !concreteSignal;
}

export async function runWorkflow(rawMessage: string, emitExternal: EventEmitter, signal?: AbortSignal) {
  const runId = crypto.randomUUID();
  const eventFactory = createEventFactory(runId);
  const startedAt = Date.now();
  let attempts = 0;
  const emit = (type: WorkflowEvent["type"], stepId: string, agentId: AgentId | null, payload: unknown) => { const event = eventFactory(type, stepId, agentId, payload); if (event) emitExternal(event); };
  const remainingMs = () => WORKFLOW_DEADLINE_MS - (Date.now() - startedAt);
  const assertRunActive = () => { if (signal?.aborted) throw new WorkflowError("interrupted"); if (remainingMs() <= 0) throw new WorkflowError("workflow_deadline"); };

  async function callAgent<T>(args: { agentId: AgentId; systemPrompt: string; context: Record<string, unknown>; schema: unknown; validator: (v: unknown) => ValidationResult<T> }) {
    let repaired = false; let repairReason = "The response did not match the required contract.";
    while (true) {
      assertRunActive(); if (attempts >= MAX_LLM_ATTEMPTS) throw new WorkflowError("call_budget"); attempts += 1;
      let lastValidationReason = repairReason;
      try {
        const prompt = repaired ? `${wrapAgentInput(args.context)}\n\n<SERVER_REPAIR_INSTRUCTION>${REPAIR_INSTRUCTION} Specific validation issue: ${repairReason}</SERVER_REPAIR_INSTRUCTION>` : wrapAgentInput(args.context);
        return (await runStructuredModel({ systemPrompt: args.systemPrompt, prompt, schema: args.schema, validator: (value) => { const result = args.validator(value); if (!result.ok) { lastValidationReason = result.reason; return null; } return result.value; }, signal, timeoutMs: Math.min(MODEL_ATTEMPT_MS, Math.max(1, remainingMs())), maxOutputTokens: 600 })).value;
      } catch (error) {
        if (error instanceof StructuredModelError && error.code === "INVALID_OUTPUT" && !repaired) { repaired = true; repairReason = lastValidationReason; continue; }
        if (error instanceof StructuredModelError) {
          if (error.code === "INVALID_OUTPUT") throw new WorkflowError("invalid_model_output", error.backendResponseReceived, `${args.agentId}: ${lastValidationReason}`);
          if (error.code === "MODEL_OFFLINE") throw new WorkflowError("model_offline", error.backendResponseReceived);
          if (error.code === "MODEL_TIMEOUT") throw new WorkflowError("model_timeout", error.backendResponseReceived);
          throw new WorkflowError("model_error", error.backendResponseReceived);
        }
        throw error;
      }
    }
  }

  async function callPrivacy(context: Record<string, unknown>, source: string) {
    emit("agent_started", "privacy", "privacy_agent", { role: "Privacy" });
    try { const value = await callAgent({ agentId: "privacy_agent", systemPrompt: PRIVACY_SYSTEM_PROMPT, context, schema: privacySchema, validator: (v) => validatePrivacy(v, source) }); emit("agent_completed", "privacy", "privacy_agent", value); return value; }
    catch (error) { emit("agent_failed", "privacy", "privacy_agent", safeErrorPayload(error)); throw error; }
  }

  async function callRouting(context: Record<string, unknown>, pass: 1 | 2) {
    emit("agent_started", "routing", "routing_agent", { role: "Routing", pass });
    try { const value = await callAgent({ agentId: "routing_agent", systemPrompt: pass === 1 ? ROUTING_SYSTEM_PROMPT : routingRevisionPrompt(), context, schema: routingSchema, validator: (v) => validateRouting(v, evidenceSource(context)) }); emit("agent_completed", "routing", "routing_agent", { ...value, pass }); emit("routing_decision", "routing", "routing_agent", { decision: "route", department: value.department, reason: value.routing_reason, pass }); return value; }
    catch (error) { emit("agent_failed", "routing", "routing_agent", safeErrorPayload(error)); throw error; }
  }

  async function callReviewer(context: Record<string, unknown>, pass: 1 | 2) {
    emit("agent_started", "reviewer", "reviewer_agent", { role: "Reviewer", pass });
    try { const value = await callAgent({ agentId: "reviewer_agent", systemPrompt: REVIEWER_SYSTEM_PROMPT, context, schema: reviewSchema, validator: (v) => validateReview(v, evidenceSource(context)) }); emit("review_completed", "reviewer", "reviewer_agent", { ...value, pass }); return value; }
    catch (error) { emit("agent_failed", "reviewer", "reviewer_agent", safeErrorPayload(error)); throw error; }
  }

  function routingCard(args: { outcome: FinalRequestCard["outcome"]; routing: RoutingDecision; initialDepartment: Department; revisionCount: 0 | 1; routeExplanation: string; reviewStatus: string; clarificationQuestion?: string | null }): FinalRequestCard {
    return { run_id: runId, outcome: args.outcome, department: args.routing.department, initial_department: args.initialDepartment, revision_count: args.revisionCount, priority: args.routing.priority, confidentiality: args.routing.confidentiality, summary: args.routing.summary, department_note: args.routing.department_brief, next_action: args.outcome === "needs_information" ? null : args.routing.next_action, route_explanation: args.routeExplanation, review_status: args.reviewStatus, clarification_question: args.clarificationQuestion ?? null };
  }

  function terminalIntakeCard(args: { intake: IntakeAssessment; outcome: "manual_review" | "needs_information"; reason: string; question?: string | null; reviewStatus: string; confidentiality?: FinalRequestCard["confidentiality"] }): FinalRequestCard {
    const department = args.intake.department_candidate === "unknown" ? null : args.intake.department_candidate;
    return { run_id: runId, outcome: args.outcome, department, initial_department: department, revision_count: 0, priority: args.intake.priority, confidentiality: args.confidentiality ?? args.intake.confidentiality, summary: args.intake.summary, department_note: null, next_action: null, route_explanation: args.reason, review_status: args.reviewStatus, clarification_question: args.question ?? args.intake.clarification_question };
  }

  function handoff(sourceStep: string, targetStep: string, sourceAgent: AgentId, targetAgent: AgentId, reason: string, forwarded: Record<string, unknown>, withheld: string[]) {
    emit("handoff_created", `handoff-${sourceStep}-${targetStep}`, sourceAgent, { handoff_id: crypto.randomUUID(), run_id: runId, source_step_id: sourceStep, target_step_id: targetStep, source_agent_id: sourceAgent, target_agent_id: targetAgent, reason, forwarded_context: forwarded, withheld_field_names: withheld, created_at: new Date().toISOString() });
  }

  try {
    const sanitized = sanitizeRequest(rawMessage);
    emit("workflow_started", "workflow", null, { status: "running" });
    emit("input_checked", "input", null, { character_count: sanitized.sanitized.length, sensitivity_flag_types: sanitized.flagTypes, deterministic_sensitivity_flags: sanitized.deterministicSensitivityFlags, confidentiality_floor: sanitized.confidentialityFloor });

    if (sanitized.flagTypes.length > 0) {
      const reason = "Credential-like material was detected and redacted. This request stops for manual review before any model call.";
      emit("routing_decision", "routing", null, { decision: "manual_review", reason, sensitivity_flag_types: sanitized.flagTypes });
      for (const agent of [["intake","intake_agent"],["privacy","privacy_agent"],["routing","routing_agent"],["reviewer","reviewer_agent"]] as const) emit("agent_skipped", agent[0], agent[1], { reason: "Sensitive input was stopped before model processing." });
      emit("workflow_completed", "workflow", null, { run_id: runId, outcome: "manual_review", department: null, initial_department: null, revision_count: 0, priority: null, confidentiality: "restricted", summary: "Sensitive request detected before model processing.", department_note: null, next_action: null, route_explanation: reason, review_status: "manual_review", clarification_question: null } satisfies FinalRequestCard); return;
    }

    emit("agent_started", "intake", "intake_agent", { role: "Intake" });
    const intakeContext = { sanitized_request: sanitized.sanitized, confidentiality_floor: sanitized.confidentialityFloor, deterministic_sensitivity_flags: sanitized.deterministicSensitivityFlags };
    let intake: IntakeAssessment;
    try { intake = await callAgent({ agentId: "intake_agent", systemPrompt: INTAKE_SYSTEM_PROMPT, context: intakeContext, schema: intakeSchema, validator: (v) => validateIntake(v, sanitized.sanitized) }); }
    catch (error) { emit("agent_failed", "intake", "intake_agent", safeErrorPayload(error)); throw error; }
    emit("agent_completed", "intake", "intake_agent", intake);

    if (intake.confidentiality === "restricted") {
      const reason = "Intake classified the request as restricted, so deterministic policy requires manual review.";
      emit("agent_skipped", "privacy", "privacy_agent", { reason }); emit("agent_skipped", "routing", "routing_agent", { reason }); emit("agent_skipped", "reviewer", "reviewer_agent", { reason }); emit("workflow_completed", "workflow", null, terminalIntakeCard({ intake, outcome: "manual_review", reason, reviewStatus: "manual_review", confidentiality: "restricted" })); return;
    }

    const underspecified = isClearlyUnderspecifiedRequest(sanitized.sanitized);
    if (intake.department_candidate === "unknown" || intake.clarification_question || underspecified) {
      const question = underspecified ? "What is the request actually about: a technical/integration issue, a business/partnership matter, or a billing/finance issue?" : intake.clarification_question ?? "What additional context is needed to understand this request?";
      const reason = underspecified ? "The request is too vague to route safely from the available information." : intake.route_reason;
      emit("agent_skipped", "privacy", "privacy_agent", { reason: "Intake needs clarification first." }); emit("agent_skipped", "routing", "routing_agent", { reason: "Intake needs clarification first." }); emit("agent_skipped", "reviewer", "reviewer_agent", { reason: "No routing decision was created." }); emit("workflow_completed", "workflow", null, terminalIntakeCard({ intake, outcome: "needs_information", reason, question, reviewStatus: "not_run" })); return;
    }

    const privacyNeeded = shouldRunPrivacy({ intake, deterministicSensitivityFlags: sanitized.deterministicSensitivityFlags, confidentialityFloor: sanitized.confidentialityFloor });
    let privacy: PrivacyDecision | null = null; let privacyCleared = false; let routingBase: Record<string, unknown>; let withheld = ["raw_request"];

    if (privacyNeeded) {
      const privacyContext = { sanitized_request: sanitized.sanitized, intake: { summary: intake.summary, request_type: intake.request_type, department_candidate: intake.department_candidate, priority: intake.priority, confidentiality: intake.confidentiality, privacy_review_needed: intake.privacy_review_needed, route_reason: intake.route_reason, evidence: intake.evidence, missing_information: intake.missing_information }, deterministic_sensitivity_flags: sanitized.deterministicSensitivityFlags, confidentiality_floor: sanitized.confidentialityFloor };
      handoff("intake", "privacy", "intake_agent", "privacy_agent", "Privacy review is required before routing.", privacyContext, ["raw_request"]);
      privacy = await callPrivacy(privacyContext, sanitized.sanitized);
      const pd = privacyTerminalDecision({ privacy, confidentialityFloor: sanitized.confidentialityFloor });
      if (pd !== "continue") {
        const outcome = pd === "needs_information" ? "needs_information" : "manual_review"; const reason = privacy.confidentiality === "restricted" ? "Privacy review classified the request as restricted, so manual review is required." : privacy.reason;
        emit("agent_skipped", "routing", "routing_agent", { reason: "Privacy stopped downstream routing." }); emit("agent_skipped", "reviewer", "reviewer_agent", { reason: "No routing decision was created." }); emit("workflow_completed", "workflow", null, { ...terminalIntakeCard({ intake, outcome, reason, question: privacy.clarification_question, reviewStatus: outcome === "manual_review" ? "manual_review_after_privacy" : "needs_information_after_privacy", confidentiality: privacy.confidentiality }), summary: privacy.safe_brief } satisfies FinalRequestCard); return;
      }
      privacyCleared = true; routingBase = buildPrivacyRoutingContext({ privacy, intake }); withheld = [...new Set(["raw_request", ...privacy.withheld_field_names, "sanitized_request"])];
      handoff("privacy", "routing", "privacy_agent", "routing_agent", privacy.reason, routingBase, withheld);
    } else {
      emit("agent_skipped", "privacy", "privacy_agent", { reason: "Privacy review not needed for this internal request." });
      routingBase = { sanitized_request: sanitized.sanitized, intake, department_profiles: DEPARTMENT_PROFILES };
      handoff("intake", "routing", "intake_agent", "routing_agent", "Routing owns the final destination decision.", routingBase, ["raw_request"]);
    }

    let routing = await callRouting(routingBase, 1); const initialDepartment = routing.department;
    const routingPolicyFail = privacyCleared ? routing.confidentiality === "restricted" : routing.confidentiality !== "internal";
    if (routingPolicyFail) { const reason = "Routing output requires manual review under the active confidentiality policy."; emit("policy_checked", "policy", null, { passed: false, reason }); emit("agent_skipped", "reviewer", "reviewer_agent", { reason }); emit("workflow_completed", "workflow", null, routingCard({ outcome: "manual_review", routing, initialDepartment, revisionCount: 0, routeExplanation: reason, reviewStatus: "manual_review" })); return; }

    const reviewerBase = privacyCleared ? { ...routingBase } : { sanitized_request: sanitized.sanitized, intake, department_profiles: DEPARTMENT_PROFILES };
    const reviewerContext1 = { ...reviewerBase, routing_decision: routing, correction_cycle: 0 };
    handoff("routing", "reviewer", "routing_agent", "reviewer_agent", "Review the RoutingDecision against the allowed context and department profiles.", reviewerContext1, withheld);
    const review1 = await callReviewer(reviewerContext1, 1);
    const d1 = decideReviewPath({ review: review1, currentDepartment: routing.department, routing, correctionCycleUsed: false, privacyCleared });
    if (d1.action === "approve") { emit("policy_checked", "policy", null, { passed: true, checks: privacyCleared ? ["privacy_reduced_context","reviewer_approved"] : ["routing_profile_match","internal_confidentiality","reviewer_approved"] }); emit("workflow_completed", "workflow", null, routingCard({ outcome: "routed_demo", routing, initialDepartment, revisionCount: 0, routeExplanation: routing.routing_reason, reviewStatus: privacyCleared ? "approved_after_privacy" : "approved" })); return; }
    if (d1.action === "needs_information") { const question = review1.correction_request ?? routing.open_questions[0] ?? "What additional information is needed to complete routing?"; emit("workflow_completed", "workflow", null, routingCard({ outcome: "needs_information", routing, initialDepartment, revisionCount: 0, routeExplanation: routing.routing_reason, reviewStatus: "needs_information", clarificationQuestion: question })); return; }
    if (d1.action === "manual_review") { emit("workflow_completed", "workflow", null, routingCard({ outcome: "manual_review", routing, initialDepartment, revisionCount: 0, routeExplanation: d1.reason, reviewStatus: review1.decision, clarificationQuestion: review1.correction_request })); return; }

    emit("revision_requested", "correction", "reviewer_agent", { cycle: 1, mode: d1.suggested_department === routing.department ? "same_department" : "reroute_suggested", from_department: routing.department, target_department: d1.suggested_department, reason: review1.reason, issues: review1.issues });
    const correctionContext = { ...routingBase, previous_routing_decision: routing, reviewer_issues: review1.issues, reviewer_reason: review1.reason, correction_request: review1.correction_request, suggested_department: d1.suggested_department, correction_cycle: 1 };
    emit("correction_started", "correction", "routing_agent", { cycle: 1, from_department: routing.department, suggested_department: d1.suggested_department });
    handoff("reviewer", "routing", "reviewer_agent", "routing_agent", review1.correction_request ?? review1.reason, correctionContext, withheld);
    const previousDepartment = routing.department; routing = await callRouting(correctionContext, 2);
    emit("correction_completed", "correction", "routing_agent", { cycle: 1, from_department: previousDepartment, department: routing.department, rerouted: previousDepartment !== routing.department });

    const correctedPolicyFail = privacyCleared ? routing.confidentiality === "restricted" : routing.confidentiality !== "internal";
    if (correctedPolicyFail) { const reason = "The corrected RoutingDecision requires manual review under the active confidentiality policy."; emit("workflow_completed", "workflow", null, routingCard({ outcome: "manual_review", routing, initialDepartment, revisionCount: 1, routeExplanation: reason, reviewStatus: "manual_review_after_correction" })); return; }

    const reviewerContext2 = { ...reviewerBase, routing_decision: routing, previous_routing_decision: correctionContext.previous_routing_decision, reviewer_1: review1, correction_cycle: 1 };
    handoff("routing", "reviewer", "routing_agent", "reviewer_agent", "Review the corrected RoutingDecision. Reviewer pass 2 is terminal.", reviewerContext2, withheld);
    const review2 = await callReviewer(reviewerContext2, 2);
    const d2 = decideReviewPath({ review: review2, currentDepartment: routing.department, routing, correctionCycleUsed: true, privacyCleared });
    if (d2.action === "approve") { emit("policy_checked", "policy", null, { passed: true, checks: ["single_correction_cycle", privacyCleared ? "privacy_reduced_context" : "internal_confidentiality", "reviewer_2_approved"] }); emit("workflow_completed", "workflow", null, routingCard({ outcome: "routed_demo", routing, initialDepartment, revisionCount: 1, routeExplanation: initialDepartment === routing.department ? "Reviewer requested one revision and Routing returned a corrected package that passed terminal review." : `Routing changed the destination from ${initialDepartment} to ${routing.department}; terminal review approved it.`, reviewStatus: initialDepartment === routing.department ? "approved_after_revision" : "approved_after_reroute" })); return; }
    if (d2.action === "needs_information") { const question = review2.correction_request ?? routing.open_questions[0] ?? "What additional information is required to complete this request?"; emit("workflow_completed", "workflow", null, routingCard({ outcome: "needs_information", routing, initialDepartment, revisionCount: 1, routeExplanation: "The terminal second review needs more information.", reviewStatus: "needs_information_after_correction", clarificationQuestion: question })); return; }
    const reason = d2.action === "manual_review" ? d2.reason : "The single reviewer correction cycle was exhausted.";
    emit("workflow_completed", "workflow", null, routingCard({ outcome: "manual_review", routing, initialDepartment, revisionCount: 1, routeExplanation: reason, reviewStatus: "manual_review_after_correction", clarificationQuestion: review2.correction_request }));
  } catch (error) { emit("workflow_failed", "workflow", null, safeErrorPayload(error)); }
}
