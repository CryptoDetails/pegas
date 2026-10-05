import type { Department, FinalRequestCard, Handoff, WorkflowEvent } from "./types";

export type WorkflowEvaluationCase = {
  id: string;
  message: string;
  expected_outcome: FinalRequestCard["outcome"];
  expected_department: Department | null;
  expected_privacy: boolean;
  notes: string;
};

export type EvaluationCaseResult = {
  id: string;
  complete: boolean;
  outcome: FinalRequestCard["outcome"] | null;
  department: Department | null;
  privacyActivated: boolean;
  boundaryCompliant: boolean;
  durationMs: number;
  logicalAgentCalls: number;
  correctionUsed: boolean;
  error: string | null;
};

export function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b)=>a-b);
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0,index)];
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted=[...values].sort((a,b)=>a-b); const mid=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[mid] : Math.round((sorted[mid-1]+sorted[mid])/2);
}

export function accuracy(numerator: number, denominator: number) { return denominator ? numerator / denominator : null; }

export function reduceWorkflowEvents(caseId: string, events: WorkflowEvent[], durationMs: number): EvaluationCaseResult {
  const seen = new Set<string>(); let terminal: FinalRequestCard | null = null; let failed: string | null = null; let privacy=false; let calls=0; let correction=false; let boundary=true;
  for (const event of events) {
    if (seen.has(event.event_id)) continue; seen.add(event.event_id);
    if (event.type === "agent_started") { calls += 1; if (event.agent_id === "privacy_agent") privacy=true; }
    if (event.type === "correction_started" || event.type === "revision_requested") correction=true;
    if (event.type === "workflow_completed") terminal=event.payload as FinalRequestCard;
    if (event.type === "workflow_failed") failed=(event.payload as {message?:string}).message ?? "workflow_failed";
    if (event.type === "handoff_created") {
      const h=event.payload as Handoff;
      if (privacy && (h.target_agent_id === "routing_agent" || h.target_agent_id === "reviewer_agent") && h.forwarded_context && Object.prototype.hasOwnProperty.call(h.forwarded_context,"sanitized_request")) boundary=false;
    }
  }
  return { id: caseId, complete: Boolean(terminal) && !failed, outcome: terminal?.outcome ?? null, department: terminal?.department ?? null, privacyActivated: privacy, boundaryCompliant: boundary, durationMs, logicalAgentCalls: calls, correctionUsed: correction, error: failed ?? (!terminal ? "stream_incomplete" : null) };
}
