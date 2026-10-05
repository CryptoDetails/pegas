import assert from "node:assert/strict";
import { buildPrivacyCorrectionBase, buildPrivacyDepartmentContext, privacyTerminalDecision, shouldRunPrivacy } from "../lib/workflow/privacy";
import { sanitizeRequest } from "../lib/workflow/sanitize";
import type { IntakeAssessment, PrivacyDecision } from "../lib/workflow/types";

const intake: IntakeAssessment = {
  summary: "Confidential partner pricing for an unreleased agreement.",
  request_type: "partnership",
  department_candidate: "business",
  priority: "medium",
  confidentiality: "confidential",
  privacy_review_needed: true,
  route_reason: "Business owns partner commercial communication.",
  evidence: [],
  missing_information: [],
  clarification_question: null,
};

const privacy: PrivacyDecision = {
  decision: "continue",
  confidentiality: "confidential",
  safe_brief: "A partner request concerns confidential commercial terms for an unreleased agreement.",
  reason: "Only a reduced commercial brief should be forwarded.",
  recipient_restrictions: ["Do not forward detailed pricing."],
  withheld_field_names: ["sanitized_request", "detailed_pricing"],
  evidence: [],
  clarification_question: null,
};

const preflight = sanitizeRequest("This fictional request includes confidential partner pricing for an unreleased agreement.");
assert.equal(preflight.flagTypes.length, 0, "non-secret confidential text must not trigger credential stop");
assert.equal(preflight.confidentialityFloor, "confidential");
assert.ok(preflight.deterministicSensitivityFlags.length > 0);
assert.equal(shouldRunPrivacy({ intake, deterministicSensitivityFlags: preflight.deterministicSensitivityFlags, confidentialityFloor: preflight.confidentialityFloor }), true);

const reduced = buildPrivacyDepartmentContext({ privacy, intake, targetDepartment: "business" });
assert.equal("sanitized_request" in reduced, false, "Privacy -> Department must not include full sanitized_request");
assert.equal(reduced.safe_brief, privacy.safe_brief);
assert.deepEqual(reduced.recipient_restrictions, privacy.recipient_restrictions);

const correctionBase = buildPrivacyCorrectionBase({ privacy, intake, targetDepartment: "finance" });
assert.equal("sanitized_request" in correctionBase, false, "correction/reroute after Privacy must not restore sanitized_request");
assert.equal(correctionBase.department_candidate, "finance");

const restrictedPrivacy: PrivacyDecision = { ...privacy, decision: "continue", confidentiality: "restricted" };
assert.equal(privacyTerminalDecision({ privacy: restrictedPrivacy, confidentialityFloor: "confidential" }), "manual_review", "restricted Privacy result cannot continue");
assert.equal(privacyTerminalDecision({ privacy, confidentialityFloor: "restricted" }), "manual_review", "restricted deterministic floor cannot be downgraded");

const secret = sanitizeRequest("Our fictional API key is sk-test-123456789. Please route this request.");
assert.ok(secret.flagTypes.length > 0);
assert.equal(secret.confidentialityFloor, "restricted");
assert.equal(shouldRunPrivacy({ intake, deterministicSensitivityFlags: secret.deterministicSensitivityFlags, confidentialityFloor: secret.confidentialityFloor }), false, "credential stop must not wake Privacy");

console.log("Phase 3 privacy tests passed: trigger, reduction, correction preservation, restricted floor, credential stop.");
