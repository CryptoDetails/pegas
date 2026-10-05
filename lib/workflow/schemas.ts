import type {
  Confidentiality,
  Department,
  DepartmentProposal,
  IntakeAssessment,
  Priority,
  ReviewDecision,
} from "./types";

const departments = ["technical", "business", "finance"] as const;
const priorities = ["low", "medium", "high"] as const;
const confidentiality = ["internal", "confidential", "restricted"] as const;
const reviewDecisions = ["approved", "revise", "manual_review", "needs_information"] as const;

// Model-facing schemas intentionally keep primitive field shapes simple for Qwen3 4B.
// Validators below normalize harmless small-model variations (notably null vs empty string)
// while preserving the canonical public TypeScript contracts.
export const intakeSchema = {
  type: "object",
  additionalProperties: false,
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
    "evidence",
    "missing_information",
    "clarification_question",
  ],
} as const;

export const departmentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    department: { type: "string", enum: departments },
    summary: { type: "string" },
    priority: { type: "string", enum: priorities },
    confidentiality: { type: "string", enum: confidentiality },
    department_note: { type: "string" },
    next_action: { type: "string" },
    open_questions: { type: "array", items: { type: "string" } },
    evidence: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  required: [
    "department",
    "summary",
    "priority",
    "confidentiality",
    "department_note",
    "next_action",
    "open_questions",
    "evidence",
  ],
} as const;

export const reviewSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    decision: { type: "string", enum: reviewDecisions },
    issues: { type: "array", items: { type: "string" } },
    correction_target: { type: "string", enum: [...departments, ""] },
    correction_request: { type: "string" },
    reason: { type: "string" },
    evidence: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  required: [
    "decision",
    "issues",
    "correction_target",
    "correction_request",
    "reason",
    "evidence",
  ],
} as const;

function record(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function exactKeys(v: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(v);
  return actual.length === keys.length && actual.every((k) => keys.includes(k));
}

function str(v: unknown, max: number, allowEmpty = false): v is string {
  return typeof v === "string" && v.length <= max && (allowEmpty || Boolean(v.trim()));
}

function strings(v: unknown, maxItem = 300): v is string[] {
  return Array.isArray(v) && v.every((x) => str(x, maxItem));
}

function normalizedStrings(v: unknown, maxItem = 300): string[] | null {
  if (!Array.isArray(v)) return null;
  const result: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxItem) return null;
    result.push(trimmed);
  }
  return result;
}

function enumValue<T extends readonly string[]>(v: unknown, values: T): v is T[number] {
  return typeof v === "string" && values.includes(v as T[number]);
}

// Evidence is optional support, not a control signal. Small local models sometimes
// paraphrase a quote even when instructed not to. We never publish such paraphrases:
// keep only exact substrings of sanitized_request and discard the rest.
function canonicalEvidence(v: unknown, source: string): string[] | null {
  if (!Array.isArray(v)) return null;
  const exact: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return null;
    if (item.length === 0 || item.length > 180) continue;
    if (!source.includes(item)) continue;
    if (!exact.includes(item)) exact.push(item);
    if (exact.length === 3) break;
  }
  return exact;
}

function nullableText(v: unknown, max: number): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string" || v.length > max) return undefined;
  const trimmed = v.trim();
  return trimmed || null;
}

export function validateIntake(v: unknown, source: string): IntakeAssessment | null {
  if (!record(v)) return null;
  const keys = [
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
  ];
  if (!exactKeys(v, keys)) return null;

  const evidence = canonicalEvidence(v.evidence, source);
  const clarificationQuestion = nullableText(v.clarification_question, 300);

  if (
    !str(v.summary, 300) ||
    !str(v.request_type, 120) ||
    !enumValue(v.department_candidate, [...departments, "unknown"] as const) ||
    !enumValue(v.priority, priorities) ||
    !enumValue(v.confidentiality, confidentiality) ||
    typeof v.privacy_review_needed !== "boolean" ||
    !str(v.route_reason, 240) ||
    evidence === null ||
    !strings(v.missing_information, 240) ||
    clarificationQuestion === undefined
  ) {
    return null;
  }

  return {
    summary: v.summary,
    request_type: v.request_type,
    department_candidate: v.department_candidate,
    priority: v.priority,
    confidentiality: v.confidentiality,
    privacy_review_needed: v.privacy_review_needed,
    route_reason: v.route_reason,
    evidence,
    missing_information: v.missing_information,
    clarification_question: clarificationQuestion,
  };
}

export function validateDepartment(
  v: unknown,
  source: string,
  selected: Department,
): DepartmentProposal | null {
  if (!record(v)) return null;
  const keys = [
    "department",
    "summary",
    "priority",
    "confidentiality",
    "department_note",
    "next_action",
    "open_questions",
    "evidence",
  ];
  if (!exactKeys(v, keys)) return null;

  const evidence = canonicalEvidence(v.evidence, source);
  const openQuestions = normalizedStrings(v.open_questions, 240);

  if (
    v.department !== selected ||
    !enumValue(v.department, departments) ||
    !str(v.summary, 300) ||
    !enumValue(v.priority, priorities) ||
    !enumValue(v.confidentiality, confidentiality) ||
    !str(v.department_note, 500) ||
    !str(v.next_action, 300) ||
    openQuestions === null ||
    evidence === null
  ) {
    return null;
  }

  return {
    department: v.department,
    summary: v.summary,
    priority: v.priority,
    confidentiality: v.confidentiality,
    department_note: v.department_note,
    next_action: v.next_action,
    open_questions: openQuestions,
    evidence,
  };
}

export function validateReview(v: unknown, source: string): ReviewDecision | null {
  if (!record(v)) return null;
  const keys = [
    "decision",
    "issues",
    "correction_target",
    "correction_request",
    "reason",
    "evidence",
  ];
  if (!exactKeys(v, keys)) return null;

  const issues = normalizedStrings(v.issues, 240);
  const evidence = canonicalEvidence(v.evidence, source);
  const correctionRequest = nullableText(v.correction_request, 300);

  let correctionTarget: Department | null;
  if (v.correction_target === null || v.correction_target === "") {
    correctionTarget = null;
  } else if (enumValue(v.correction_target, departments)) {
    correctionTarget = v.correction_target;
  } else {
    return null;
  }

  if (
    !enumValue(v.decision, reviewDecisions) ||
    issues === null ||
    correctionRequest === undefined ||
    !str(v.reason, 240) ||
    evidence === null
  ) {
    return null;
  }

  return {
    decision: v.decision,
    issues,
    correction_target: correctionTarget,
    correction_request: correctionRequest,
    reason: v.reason,
    evidence,
  };
}
