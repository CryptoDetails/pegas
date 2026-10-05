import type { Department, DepartmentProposal, ReviewDecision } from "./types";

export type ReviewPathDecision =
  | { action: "approve" }
  | { action: "needs_information" }
  | { action: "manual_review"; reason: string }
  | { action: "same_department_revision"; target_department: Department }
  | { action: "reroute"; target_department: Department };

const sensitivityPattern = /\b(privacy|private data|personal data|sensitive|confidential|restricted|credential|secret|api key|password|access token|auth token|secret token)\b/i;

export function reviewerSignalsSensitivity(review: ReviewDecision) {
  const publicText = [review.reason, review.correction_request ?? "", ...review.issues].join(" ");
  return sensitivityPattern.test(publicText);
}

export function decideReviewPath(args: {
  review: ReviewDecision;
  currentDepartment: Department;
  proposal: DepartmentProposal;
  correctionCycleUsed: boolean;
}): ReviewPathDecision {
  const { review, currentDepartment, proposal, correctionCycleUsed } = args;

  if (proposal.confidentiality !== "internal" || reviewerSignalsSensitivity(review)) {
    return { action: "manual_review", reason: "Sensitivity or privacy escalation requires manual review." };
  }

  if (review.decision === "approved") {
    if (review.correction_target && review.correction_target !== currentDepartment) {
      return { action: "manual_review", reason: "Reviewer approval conflicted with a different department target." };
    }
    return { action: "approve" };
  }

  if (review.decision === "needs_information") return { action: "needs_information" };

  if (review.decision === "manual_review") {
    return { action: "manual_review", reason: review.reason };
  }

  if (correctionCycleUsed) {
    return { action: "manual_review", reason: "The single reviewer correction cycle was exhausted." };
  }

  const target = review.correction_target ?? currentDepartment;
  if (target === currentDepartment) {
    return { action: "same_department_revision", target_department: currentDepartment };
  }
  return { action: "reroute", target_department: target };
}
