import type {
  Department,
  RoutingDecision,
  IntakeAssessment,
  PrivacyDecision,
  ReviewDecision,
} from "./types";

const departments = ["technical", "business", "finance"] as const;
const priorities = ["low", "medium", "high"] as const;
const confidentiality = ["internal", "confidential", "restricted"] as const;
const reviewDecisions = ["approved", "revise", "manual_review", "needs_information"] as const;
const privacyDecisions = ["continue", "manual_review", "needs_information"] as const;

// These schemas guide Ollama/Qwen. They intentionally require only the fields that
// actually control routing/policy. Non-control arrays and nullable text are optional
// because the backend normalizes them into the canonical public contracts below.
export const intakeSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    request_type: { type: "string" },
    department_candidate: { type: "string", enum: [...departments, "unknown"] },
    priority: { type: "string", enum: priorities },
    confidentiality: { type: "string", enum: confidentiality },
    privacy_review_needed: { type: "boolean" },
    route_reason: { type: "string" },
    evidence: { type: "array", items: { type: "string" }, maxItems: 3 },
    missing_information: { type: "array", items: { type: "string" } },
    clarification_question: { type: "string" },
  },
  required: [
    "summary",
    "request_type",
    "department_candidate",
    "priority",
    "confidentiality",
    "privacy_review_needed",
    "route_reason",
  ],
} as const;


export const privacySchema = {
  type: "object",
  properties: {
    decision: { type: "string", enum: privacyDecisions },
    confidentiality: { type: "string", enum: confidentiality },
    safe_brief: { type: "string" },
    reason: { type: "string" },
    recipient_restrictions: { type: "array", items: { type: "string" }, maxItems: 4 },
    withheld_field_names: { type: "array", items: { type: "string" }, maxItems: 8 },
    evidence: { type: "array", items: { type: "string" }, maxItems: 3 },
    clarification_question: { type: "string" },
  },
  required: ["decision", "confidentiality", "safe_brief", "reason"],
} as const;

export const routingSchema = {
  type: "object",
  properties: {
    department: { type: "string", enum: departments },
    summary: { type: "string" },
    priority: { type: "string", enum: priorities },
    confidentiality: { type: "string", enum: confidentiality },
    routing_reason: { type: "string" },
    department_brief: { type: "string" },
    next_action: { type: "string" },
    open_questions: { type: "array", items: { type: "string" } },
    evidence: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  required: [
    "department",
    "summary",
    "priority",
    "confidentiality",
    "routing_reason",
    "department_brief",
    "next_action",
  ],
} as const;

export const reviewSchema = {
  type: "object",
  properties: {
    decision: { type: "string", enum: reviewDecisions },
    issues: { type: "array", items: { type: "string" } },
    correction_target: { type: "string", enum: [...departments, ""] },
    correction_request: { type: "string" },
    reason: { type: "string" },
    evidence: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  required: ["decision", "reason"],
} as const;

type ValidationFailure = { ok: false; reason: string };
type ValidationSuccess<T> = { ok: true; value: T; normalized_fields: string[] };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function isFailure<T>(result: ValidationResult<T>): result is ValidationFailure {
  return result.ok === false;
}

function record(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function objectForAgent(v: unknown, expectedKeys: readonly string[]): {
  value: Record<string, unknown> | null;
  normalized: string[];
} {
  if (!record(v)) return { value: null, normalized: [] };

  if (expectedKeys.some((key) => key in v)) {
    return { value: v, normalized: [] };
  }

  for (const wrapper of ["result", "output", "response", "data"] as const) {
    const nested = v[wrapper];
    if (record(nested) && expectedKeys.some((key) => key in nested)) {
      return { value: nested, normalized: [`unwrapped_${wrapper}`] };
    }
  }

  return { value: v, normalized: [] };
}

function requiredText(
  value: unknown,
  field: string,
  max: number,
): ValidationResult<string> {
  if (typeof value !== "string") {
    return { ok: false, reason: `${field} must be a string` };
  }
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: `${field} must not be empty` };
  if (trimmed.length > max) {
    return {
      ok: true,
      value: trimmed.slice(0, max).trimEnd(),
      normalized_fields: [`truncated_${field}`],
    };
  }
  return {
    ok: true,
    value: trimmed,
    normalized_fields: trimmed === value ? [] : [`trimmed_${field}`],
  };
}

function optionalText(
  value: unknown,
  field: string,
  max: number,
): ValidationResult<string | null> {
  if (value === undefined || value === null || value === "") {
    return {
      ok: true,
      value: null,
      normalized_fields: value === undefined ? [`defaulted_${field}`] : [],
    };
  }
  if (typeof value !== "string") {
    return { ok: false, reason: `${field} must be a string, null, or omitted` };
  }
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null, normalized_fields: [`normalized_${field}`] };
  if (trimmed.length > max) {
    return {
      ok: true,
      value: trimmed.slice(0, max).trimEnd(),
      normalized_fields: [`truncated_${field}`],
    };
  }
  return {
    ok: true,
    value: trimmed,
    normalized_fields: trimmed === value ? [] : [`trimmed_${field}`],
  };
}

function textArray(
  value: unknown,
  field: string,
  maxItem: number,
): ValidationResult<string[]> {
  if (value === undefined || value === null) {
    return { ok: true, value: [], normalized_fields: [`defaulted_${field}`] };
  }

  const source = typeof value === "string" ? [value] : value;
  if (!Array.isArray(source)) {
    return { ok: false, reason: `${field} must be an array, string, null, or omitted` };
  }

  const result: string[] = [];
  let normalized = typeof value === "string";
  for (const item of source) {
    if (typeof item !== "string") {
      return { ok: false, reason: `${field} contains a non-string item` };
    }
    const trimmed = item.trim();
    if (!trimmed) {
      normalized = true;
      continue;
    }
    if (trimmed.length > maxItem) {
      result.push(trimmed.slice(0, maxItem).trimEnd());
      normalized = true;
      continue;
    }
    result.push(trimmed);
    if (trimmed !== item) normalized = true;
  }

  return {
    ok: true,
    value: result,
    normalized_fields: normalized ? [`normalized_${field}`] : [],
  };
}

function evidenceArray(value: unknown, source: string): { value: string[]; normalized_fields: string[] } {
  if (!Array.isArray(value)) {
    return {
      value: [],
      normalized_fields: value === undefined ? ["defaulted_evidence"] : ["discarded_invalid_evidence"],
    };
  }

  const exact: string[] = [];
  let discarded = false;
  for (const item of value) {
    if (typeof item !== "string") {
      discarded = true;
      continue;
    }
    const candidate = item.trim();
    if (!candidate || candidate.length > 180 || !source.includes(candidate)) {
      discarded = true;
      continue;
    }
    if (!exact.includes(candidate)) exact.push(candidate);
    if (exact.length === 3) break;
  }

  return {
    value: exact,
    normalized_fields: discarded ? ["filtered_evidence"] : [],
  };
}

function enumText<T extends readonly string[]>(
  value: unknown,
  field: string,
  values: T,
): ValidationResult<T[number]> {
  if (typeof value !== "string") {
    return { ok: false, reason: `${field} must be one of: ${values.join(", ")}` };
  }
  const normalized = value.trim().toLowerCase();
  if (!values.includes(normalized as T[number])) {
    return { ok: false, reason: `${field} has unsupported value ${JSON.stringify(value)}` };
  }
  return {
    ok: true,
    value: normalized as T[number],
    normalized_fields: normalized === value ? [] : [`normalized_${field}`],
  };
}

function booleanValue(value: unknown, field: string): ValidationResult<boolean> {
  if (typeof value === "boolean") return { ok: true, value, normalized_fields: [] };
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "false") {
      return { ok: true, value: normalized === "true", normalized_fields: [`normalized_${field}`] };
    }
  }
  return { ok: false, reason: `${field} must be true or false` };
}

function mergeNormalized(...parts: string[][]) {
  return [...new Set(parts.flat())];
}

export function validateIntake(v: unknown, source: string): ValidationResult<IntakeAssessment> {
  const expected = [
    "summary",
    "request_type",
    "department_candidate",
    "priority",
    "confidentiality",
    "privacy_review_needed",
    "route_reason",
    "evidence",
    "missing_information",
    "clarification_question",
  ] as const;
  const root = objectForAgent(v, expected);
  if (!root.value) return { ok: false, reason: "intake output must be a JSON object" };
  const data = root.value;

  const summary = requiredText(data.summary, "summary", 300);
  if (isFailure(summary)) return summary;
  const requestType = requiredText(data.request_type, "request_type", 120);
  if (isFailure(requestType)) return requestType;
  const department = enumText(data.department_candidate, "department_candidate", [...departments, "unknown"] as const);
  if (isFailure(department)) return department;
  const priority = enumText(data.priority, "priority", priorities);
  if (isFailure(priority)) return priority;
  const confidentialityValue = enumText(data.confidentiality, "confidentiality", confidentiality);
  if (isFailure(confidentialityValue)) return confidentialityValue;
  const privacy = booleanValue(data.privacy_review_needed, "privacy_review_needed");
  if (isFailure(privacy)) return privacy;
  const routeReason = requiredText(data.route_reason, "route_reason", 240);
  if (isFailure(routeReason)) return routeReason;
  const evidence = evidenceArray(data.evidence, source);
  const missing = textArray(data.missing_information, "missing_information", 240);
  if (isFailure(missing)) return missing;
  const clarification = optionalText(data.clarification_question, "clarification_question", 300);
  if (isFailure(clarification)) return clarification;

  return {
    ok: true,
    value: {
      summary: summary.value,
      request_type: requestType.value,
      department_candidate: department.value,
      priority: priority.value,
      confidentiality: confidentialityValue.value,
      privacy_review_needed: privacy.value,
      route_reason: routeReason.value,
      evidence: evidence.value,
      missing_information: missing.value,
      clarification_question: clarification.value,
    },
    normalized_fields: mergeNormalized(
      root.normalized,
      summary.normalized_fields,
      requestType.normalized_fields,
      department.normalized_fields,
      priority.normalized_fields,
      confidentialityValue.normalized_fields,
      privacy.normalized_fields,
      routeReason.normalized_fields,
      evidence.normalized_fields,
      missing.normalized_fields,
      clarification.normalized_fields,
    ),
  };
}


export function validatePrivacy(v: unknown, source: string): ValidationResult<PrivacyDecision> {
  const expected = [
    "decision",
    "confidentiality",
    "safe_brief",
    "reason",
    "recipient_restrictions",
    "withheld_field_names",
    "evidence",
    "clarification_question",
  ] as const;
  const root = objectForAgent(v, expected);
  if (!root.value) return { ok: false, reason: "privacy output must be a JSON object" };
  const data = root.value;

  const decision = enumText(data.decision, "decision", privacyDecisions);
  if (isFailure(decision)) return decision;
  const confidentialityValue = enumText(data.confidentiality, "confidentiality", confidentiality);
  if (isFailure(confidentialityValue)) return confidentialityValue;
  const safeBrief = requiredText(data.safe_brief, "safe_brief", 400);
  if (isFailure(safeBrief)) return safeBrief;
  const reason = requiredText(data.reason, "reason", 240);
  if (isFailure(reason)) return reason;
  const restrictions = textArray(data.recipient_restrictions, "recipient_restrictions", 180);
  if (isFailure(restrictions)) return restrictions;
  if (restrictions.value.length > 4) return { ok: false, reason: "recipient_restrictions exceeds 4 entries" };
  const withheld = textArray(data.withheld_field_names, "withheld_field_names", 120);
  if (isFailure(withheld)) return withheld;
  if (withheld.value.length > 8) return { ok: false, reason: "withheld_field_names exceeds 8 entries" };
  const evidence = evidenceArray(data.evidence, source);
  const clarification = optionalText(data.clarification_question, "clarification_question", 300);
  if (isFailure(clarification)) return clarification;

  const withheldFields = [...new Set(withheld.value)];
  if (!withheldFields.includes("sanitized_request")) withheldFields.push("sanitized_request");

  return {
    ok: true,
    value: {
      decision: decision.value,
      confidentiality: confidentialityValue.value,
      safe_brief: safeBrief.value,
      reason: reason.value,
      recipient_restrictions: restrictions.value,
      withheld_field_names: withheldFields.slice(0, 8),
      evidence: evidence.value,
      clarification_question: clarification.value,
    },
    normalized_fields: mergeNormalized(
      root.normalized,
      decision.normalized_fields,
      confidentialityValue.normalized_fields,
      safeBrief.normalized_fields,
      reason.normalized_fields,
      restrictions.normalized_fields,
      withheld.normalized_fields,
      evidence.normalized_fields,
      clarification.normalized_fields,
    ),
  };
}

export function validateRouting(
  v: unknown,
  source: string,
): ValidationResult<RoutingDecision> {
  const expected = [
    "department",
    "summary",
    "priority",
    "confidentiality",
    "routing_reason",
    "department_brief",
    "next_action",
    "open_questions",
    "evidence",
  ] as const;
  const root = objectForAgent(v, expected);
  if (!root.value) return { ok: false, reason: "routing output must be a JSON object" };
  const data = root.value;

  const department = enumText(data.department, "department", departments);
  if (isFailure(department)) return department;
  const summary = requiredText(data.summary, "summary", 300);
  if (isFailure(summary)) return summary;
  const priority = enumText(data.priority, "priority", priorities);
  if (isFailure(priority)) return priority;
  const confidentialityValue = enumText(data.confidentiality, "confidentiality", confidentiality);
  if (isFailure(confidentialityValue)) return confidentialityValue;
  const routingReason = requiredText(data.routing_reason, "routing_reason", 240);
  if (isFailure(routingReason)) return routingReason;
  const departmentBrief = requiredText(data.department_brief, "department_brief", 500);
  if (isFailure(departmentBrief)) return departmentBrief;
  const nextAction = requiredText(data.next_action, "next_action", 400);
  if (isFailure(nextAction)) return nextAction;
  const openQuestions = textArray(data.open_questions, "open_questions", 240);
  if (isFailure(openQuestions)) return openQuestions;
  if (openQuestions.value.length > 4) return { ok: false, reason: "open_questions exceeds 4 entries" };
  const evidence = evidenceArray(data.evidence, source);

  return {
    ok: true,
    value: {
      department: department.value,
      summary: summary.value,
      priority: priority.value,
      confidentiality: confidentialityValue.value,
      routing_reason: routingReason.value,
      department_brief: departmentBrief.value,
      next_action: nextAction.value,
      open_questions: openQuestions.value,
      evidence: evidence.value,
    },
    normalized_fields: mergeNormalized(
      root.normalized,
      department.normalized_fields,
      summary.normalized_fields,
      priority.normalized_fields,
      confidentialityValue.normalized_fields,
      routingReason.normalized_fields,
      departmentBrief.normalized_fields,
      nextAction.normalized_fields,
      openQuestions.normalized_fields,
      evidence.normalized_fields,
    ),
  };
}

export function validateReview(v: unknown, source: string): ValidationResult<ReviewDecision> {
  const expected = [
    "decision",
    "issues",
    "correction_target",
    "correction_request",
    "reason",
    "evidence",
  ] as const;
  const root = objectForAgent(v, expected);
  if (!root.value) return { ok: false, reason: "review output must be a JSON object" };
  const data = root.value;

  const decision = enumText(data.decision, "decision", reviewDecisions);
  if (isFailure(decision)) return decision;
  const issues = textArray(data.issues, "issues", 240);
  if (isFailure(issues)) return issues;
  const reason = requiredText(data.reason, "reason", 240);
  if (isFailure(reason)) return reason;
  const correctionRequest = optionalText(data.correction_request, "correction_request", 300);
  if (isFailure(correctionRequest)) return correctionRequest;
  const evidence = evidenceArray(data.evidence, source);

  let correctionTarget: Department | null = null;
  const targetRaw = data.correction_target;
  const targetNormalized: string[] = [];
  if (targetRaw !== undefined && targetRaw !== null && targetRaw !== "") {
    const target = enumText(targetRaw, "correction_target", departments);
    if (isFailure(target)) return target;
    correctionTarget = target.value;
    targetNormalized.push(...target.normalized_fields);
  } else if (targetRaw === undefined) {
    targetNormalized.push("defaulted_correction_target");
  }

  return {
    ok: true,
    value: {
      decision: decision.value,
      issues: issues.value,
      correction_target: correctionTarget,
      correction_request: correctionRequest.value,
      reason: reason.value,
      evidence: evidence.value,
    },
    normalized_fields: mergeNormalized(
      root.normalized,
      decision.normalized_fields,
      issues.normalized_fields,
      targetNormalized,
      correctionRequest.normalized_fields,
      reason.normalized_fields,
      evidence.normalized_fields,
    ),
  };
}
