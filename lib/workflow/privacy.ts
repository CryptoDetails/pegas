import type { Confidentiality, Department, IntakeAssessment, PrivacyDecision } from "./types";

export function shouldRunPrivacy(args: {
  intake: IntakeAssessment;
  deterministicSensitivityFlags: string[];
  confidentialityFloor: Confidentiality;
}) {
  if (args.confidentialityFloor === "restricted") return false;
  return args.intake.privacy_review_needed
    || args.intake.confidentiality === "confidential"
    || args.deterministicSensitivityFlags.length > 0;
}

export function privacyTerminalDecision(args: {
  privacy: PrivacyDecision;
  confidentialityFloor: Confidentiality;
}): "continue" | "manual_review" | "needs_information" {
  if (args.confidentialityFloor === "restricted" || args.privacy.confidentiality === "restricted") {
    return "manual_review";
  }
  return args.privacy.decision;
}

export function buildPrivacyDepartmentContext(args: {
  privacy: PrivacyDecision;
  intake: IntakeAssessment;
  targetDepartment: Department;
}) {
  return {
    safe_brief: args.privacy.safe_brief,
    request_type: args.intake.request_type,
    department_candidate: args.targetDepartment,
    priority: args.intake.priority,
    confidentiality: args.privacy.confidentiality,
    route_reason: args.intake.route_reason,
    privacy_reason: args.privacy.reason,
    recipient_restrictions: args.privacy.recipient_restrictions,
    evidence: args.privacy.evidence,
  };
}

export function buildPrivacyCorrectionBase(args: {
  privacy: PrivacyDecision;
  intake: IntakeAssessment;
  targetDepartment: Department;
}) {
  return buildPrivacyDepartmentContext(args);
}
