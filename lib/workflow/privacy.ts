import type { Confidentiality, IntakeAssessment, PrivacyDecision } from "./types";
import { DEPARTMENT_PROFILES } from "./departments.ts";

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
  if (args.confidentialityFloor === "restricted" || args.privacy.confidentiality === "restricted") return "manual_review";
  return args.privacy.decision;
}

export function buildPrivacyRoutingContext(args: { privacy: PrivacyDecision; intake: IntakeAssessment }) {
  return {
    safe_brief: args.privacy.safe_brief,
    request_type: args.intake.request_type,
    routing_hint: args.intake.department_candidate,
    priority: args.intake.priority,
    confidentiality: args.privacy.confidentiality,
    route_reason: args.intake.route_reason,
    privacy_reason: args.privacy.reason,
    recipient_restrictions: args.privacy.recipient_restrictions,
    evidence: args.privacy.evidence,
    department_profiles: DEPARTMENT_PROFILES,
  };
}
