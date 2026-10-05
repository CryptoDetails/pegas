import { strict as assert } from "node:assert";
import { decideReviewPath } from "../lib/workflow/correction.ts";
import type { Department, ReviewDecision, RoutingDecision } from "../lib/workflow/types";

const routing=(department:Department, confidentiality:RoutingDecision["confidentiality"]="internal"):RoutingDecision=>({department,summary:"demo",priority:"medium",confidentiality,routing_reason:"reason",department_brief:"brief",next_action:"next",open_questions:[],evidence:[]});
const review=(overrides:Partial<ReviewDecision>):ReviewDecision=>({decision:"approved",issues:[],correction_target:null,correction_request:null,reason:"Approved.",evidence:[],...overrides});

const same=decideReviewPath({review:review({decision:"revise",reason:"Refine"}),currentDepartment:"technical",routing:routing("technical"),correctionCycleUsed:false});
assert.equal(same.action,"revise");
if(same.action==="revise") assert.equal(same.suggested_department,"technical");
const reroute=decideReviewPath({review:review({decision:"revise",correction_target:"finance",reason:"Billing"}),currentDepartment:"business",routing:routing("business"),correctionCycleUsed:false});
assert.equal(reroute.action,"revise");
if(reroute.action==="revise") assert.equal(reroute.suggested_department,"finance");
const exhausted=decideReviewPath({review:review({decision:"revise",reason:"Again"}),currentDepartment:"technical",routing:routing("technical"),correctionCycleUsed:true});
assert.equal(exhausted.action,"manual_review");
const sensitivity=decideReviewPath({review:review({decision:"revise",reason:"Restricted data needs privacy review."}),currentDepartment:"business",routing:routing("business"),correctionCycleUsed:false});
assert.equal(sensitivity.action,"manual_review");
const proposalSensitivity=decideReviewPath({review:review({decision:"revise",reason:"Move"}),currentDepartment:"business",routing:routing("business","confidential"),correctionCycleUsed:false});
assert.equal(proposalSensitivity.action,"manual_review");
console.log("Phase 2 deterministic correction tests passed (adapted to Phase 4 Routing ownership). ");
