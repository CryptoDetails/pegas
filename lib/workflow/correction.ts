import type { Department, ReviewDecision, RoutingDecision } from "./types";

export type ReviewPathDecision =
  | { action: "approve" }
  | { action: "needs_information" }
  | { action: "manual_review"; reason: string }
  | { action: "revise"; suggested_department: Department };

const sensitivityPattern = /\b(privacy|private data|personal data|sensitive|confidential|restricted|credential|secret|api key|password|access token|auth token|secret token)\b/i;
const escalatedSensitivityPattern = /\b(private data|personal data|restricted|credential|secret|api key|password|access token|auth token|secret token)\b/i;

function reviewPublicText(review: ReviewDecision) {
  return [review.reason, review.correction_request ?? "", ...review.issues].join(" ");
}

export function reviewerSignalsSensitivity(review: ReviewDecision) { return sensitivityPattern.test(reviewPublicText(review)); }
export function reviewerSignalsEscalatedSensitivity(review: ReviewDecision) { return escalatedSensitivityPattern.test(reviewPublicText(review)); }

export function decideReviewPath(args: {
  review: ReviewDecision;
  currentDepartment: Department;
  routing: RoutingDecision;
  correctionCycleUsed: boolean;
  privacyCleared?: boolean;
}): ReviewPathDecision {
  const { review, currentDepartment, routing, correctionCycleUsed, privacyCleared = false } = args;
  const routingRequiresManual = privacyCleared ? routing.confidentiality === "restricted" : routing.confidentiality !== "internal";
  const reviewerRequiresManual = privacyCleared ? reviewerSignalsEscalatedSensitivity(review) : reviewerSignalsSensitivity(review);
  if (routingRequiresManual || reviewerRequiresManual) return { action: "manual_review", reason: "Sensitivity or privacy escalation requires manual review." };
  if (review.decision === "approved") {
    if (review.correction_target && review.correction_target !== currentDepartment) return { action: "manual_review", reason: "Reviewer approval conflicted with a different department suggestion." };
    return { action: "approve" };
  }
  if (review.decision === "needs_information") return { action: "needs_information" };
  if (review.decision === "manual_review") return { action: "manual_review", reason: review.reason };
  if (correctionCycleUsed) return { action: "manual_review", reason: "The single reviewer correction cycle was exhausted." };
  return { action: "revise", suggested_department: review.correction_target ?? currentDepartment };
}
