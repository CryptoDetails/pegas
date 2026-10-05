import { strict as assert } from "node:assert";
import { decideReviewPath } from "../lib/workflow/correction";
import type { Department, DepartmentProposal, ReviewDecision } from "../lib/workflow/types";

const proposal = (
  department: Department,
  confidentiality: DepartmentProposal["confidentiality"] = "internal",
): DepartmentProposal => ({
  department,
  summary: "demo",
  priority: "medium",
  confidentiality,
  department_note: "note",
  next_action: "next",
  open_questions: [],
  evidence: [],
});

const review = (overrides: Partial<ReviewDecision>): ReviewDecision => ({
  decision: "approved",
  issues: [],
  correction_target: null,
  correction_request: null,
  reason: "Approved.",
  evidence: [],
  ...overrides,
});

type Simulation = {
  callsAfterReviewer1: string[];
  finalAction: string;
  finalDepartment: Department;
  revisionCount: 0 | 1;
};

function simulateCorrectionPath(args: {
  initialDepartment: Department;
  firstProposal?: DepartmentProposal;
  review1: ReviewDecision;
  review2?: ReviewDecision;
}): Simulation {
  let currentDepartment = args.initialDepartment;
  let currentProposal = args.firstProposal ?? proposal(currentDepartment);
  const callsAfterReviewer1: string[] = [];

  const first = decideReviewPath({
    review: args.review1,
    currentDepartment,
    proposal: currentProposal,
    correctionCycleUsed: false,
  });

  if (
    first.action === "approve" ||
    first.action === "needs_information" ||
    first.action === "manual_review"
  ) {
    return {
      callsAfterReviewer1,
      finalAction: first.action,
      finalDepartment: currentDepartment,
      revisionCount: 0,
    };
  }

  currentDepartment = first.target_department;
  callsAfterReviewer1.push(`${currentDepartment}_agent`, "reviewer_agent");
  currentProposal = proposal(currentDepartment);

  const second = decideReviewPath({
    review: args.review2 ?? review({ decision: "approved" }),
    currentDepartment,
    proposal: currentProposal,
    correctionCycleUsed: true,
  });

  return {
    callsAfterReviewer1,
    finalAction: second.action,
    finalDepartment: currentDepartment,
    revisionCount: 1,
  };
}

const sameDepartment = simulateCorrectionPath({
  initialDepartment: "technical",
  review1: review({
    decision: "revise",
    correction_request: "Clarify the technical next step.",
    reason: "The next action needs refinement.",
  }),
  review2: review({ decision: "approved" }),
});

assert.deepEqual(sameDepartment.callsAfterReviewer1, [
  "technical_agent",
  "reviewer_agent",
]);
assert.equal(sameDepartment.finalAction, "approve");
assert.equal(sameDepartment.revisionCount, 1);

const reroute = simulateCorrectionPath({
  initialDepartment: "business",
  review1: review({
    decision: "revise",
    correction_target: "finance",
    correction_request: "Route to Finance.",
    reason: "This is a billing request.",
  }),
  review2: review({ decision: "approved" }),
});

assert.deepEqual(reroute.callsAfterReviewer1, ["finance_agent", "reviewer_agent"]);
assert.equal(reroute.finalDepartment, "finance");
assert.equal(reroute.finalAction, "approve");
assert.equal(reroute.revisionCount, 1);

const secondRevisionStops = simulateCorrectionPath({
  initialDepartment: "technical",
  review1: review({ decision: "revise", reason: "Refine the proposal." }),
  review2: review({
    decision: "revise",
    reason: "One more change is needed.",
  }),
});

assert.deepEqual(secondRevisionStops.callsAfterReviewer1, [
  "technical_agent",
  "reviewer_agent",
]);
assert.equal(secondRevisionStops.finalAction, "manual_review");

const sensitivityBeforeCorrection = simulateCorrectionPath({
  initialDepartment: "business",
  review1: review({
    decision: "revise",
    correction_target: "finance",
    reason: "Restricted data needs privacy review.",
  }),
});

assert.deepEqual(sensitivityBeforeCorrection.callsAfterReviewer1, []);
assert.equal(sensitivityBeforeCorrection.finalAction, "manual_review");
assert.equal(sensitivityBeforeCorrection.revisionCount, 0);

const departmentSensitivityBeforeCorrection = simulateCorrectionPath({
  initialDepartment: "business",
  firstProposal: proposal("business", "confidential"),
  review1: review({
    decision: "revise",
    correction_target: "finance",
    reason: "Move this request.",
  }),
});

assert.deepEqual(departmentSensitivityBeforeCorrection.callsAfterReviewer1, []);
assert.equal(departmentSensitivityBeforeCorrection.finalAction, "manual_review");

console.log(
  "Phase 2 deterministic correction tests passed (5 acceptance paths).",
);
