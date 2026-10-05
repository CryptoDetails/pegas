import type { Confidentiality, Department, DepartmentProposal, IntakeAssessment, Priority, ReviewDecision } from "./types";

const departments = ["technical", "business", "finance"] as const;
const priorities = ["low", "medium", "high"] as const;
const confidentiality = ["internal", "confidential", "restricted"] as const;
const reviewDecisions = ["approved", "revise", "manual_review", "needs_information"] as const;

export const intakeSchema = { type: "object", additionalProperties: false, properties: {
  summary:{type:"string"}, request_type:{type:"string"}, department_candidate:{type:"string",enum:[...departments,"unknown"]}, priority:{type:"string",enum:priorities}, confidentiality:{type:"string",enum:confidentiality}, privacy_review_needed:{type:"boolean"}, route_reason:{type:"string"}, evidence:{type:"array",items:{type:"string"},maxItems:3}, missing_information:{type:"array",items:{type:"string"}}, clarification_question:{anyOf:[{type:"string"},{type:"null"}]}
}, required:["summary","request_type","department_candidate","priority","confidentiality","privacy_review_needed","route_reason","evidence","missing_information","clarification_question"] } as const;
export const departmentSchema = { type:"object", additionalProperties:false, properties:{ department:{type:"string",enum:departments}, summary:{type:"string"}, priority:{type:"string",enum:priorities}, confidentiality:{type:"string",enum:confidentiality}, department_note:{type:"string"}, next_action:{type:"string"}, open_questions:{type:"array",items:{type:"string"}}, evidence:{type:"array",items:{type:"string"},maxItems:3}}, required:["department","summary","priority","confidentiality","department_note","next_action","open_questions","evidence"] } as const;
export const reviewSchema = { type:"object", additionalProperties:false, properties:{ decision:{type:"string",enum:reviewDecisions}, issues:{type:"array",items:{type:"string"}}, correction_target:{anyOf:[{type:"string",enum:departments},{type:"null"}]}, correction_request:{anyOf:[{type:"string"},{type:"null"}]}, reason:{type:"string"}, evidence:{type:"array",items:{type:"string"},maxItems:3}}, required:["decision","issues","correction_target","correction_request","reason","evidence"] } as const;

function record(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function exactKeys(v: Record<string,unknown>, keys:string[]) { const actual=Object.keys(v); return actual.length===keys.length && actual.every(k=>keys.includes(k)); }
function str(v: unknown, max:number, allowEmpty=false): v is string { return typeof v==="string" && v.length<=max && (allowEmpty || Boolean(v.trim())); }
function nullableStr(v:unknown,max:number): v is string|null { return v===null || str(v,max); }
function strings(v: unknown, maxItem=300): v is string[] { return Array.isArray(v) && v.every(x=>str(x,maxItem)); }
function enumValue<T extends readonly string[]>(v:unknown, values:T): v is T[number] { return typeof v==="string" && values.includes(v as T[number]); }
function validEvidence(v:unknown, source:string) { return Array.isArray(v) && v.length<=3 && v.every(x=>typeof x==="string" && x.length>0 && x.length<=180 && source.includes(x)); }

export function validateIntake(v:unknown, source:string): IntakeAssessment|null {
  if(!record(v)) return null; const keys=["summary","request_type","department_candidate","priority","confidentiality","privacy_review_needed","route_reason","evidence","missing_information","clarification_question"]; if(!exactKeys(v,keys)) return null;
  if(!str(v.summary,300)||!str(v.request_type,120)||!enumValue(v.department_candidate,[...departments,"unknown"] as const)||!enumValue(v.priority,priorities)||!enumValue(v.confidentiality,confidentiality)||typeof v.privacy_review_needed!=="boolean"||!str(v.route_reason,240)||!validEvidence(v.evidence,source)||!strings(v.missing_information,240)||!nullableStr(v.clarification_question,300)) return null;
  return v as IntakeAssessment;
}
export function validateDepartment(v:unknown, source:string, selected:Department): DepartmentProposal|null {
  if(!record(v)) return null; const keys=["department","summary","priority","confidentiality","department_note","next_action","open_questions","evidence"]; if(!exactKeys(v,keys)) return null;
  if(v.department!==selected||!enumValue(v.department,departments)||!str(v.summary,300)||!enumValue(v.priority,priorities)||!enumValue(v.confidentiality,confidentiality)||!str(v.department_note,500)||!str(v.next_action,300)||!strings(v.open_questions,240)||!validEvidence(v.evidence,source)) return null;
  return v as DepartmentProposal;
}
export function validateReview(v:unknown, source:string): ReviewDecision|null {
  if(!record(v)) return null; const keys=["decision","issues","correction_target","correction_request","reason","evidence"]; if(!exactKeys(v,keys)) return null;
  if(!enumValue(v.decision,reviewDecisions)||!strings(v.issues,240)||!(v.correction_target===null||enumValue(v.correction_target,departments))||!nullableStr(v.correction_request,300)||!str(v.reason,240)||!validEvidence(v.evidence,source)) return null;
  return v as ReviewDecision;
}
