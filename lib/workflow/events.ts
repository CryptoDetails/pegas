import type { AgentId, WorkflowEvent, WorkflowEventType } from "./types";

export type EventEmitter = (event: WorkflowEvent) => void;

export function createEventFactory(runId: string) {
  let seq = 0;
  let terminal = false;
  return (type: WorkflowEventType, stepId: string, agentId: AgentId | null, payload: unknown): WorkflowEvent | null => {
    if (terminal) return null;
    seq += 1;
    const event: WorkflowEvent = {
      event_version: 1,
      run_id: runId,
      event_id: crypto.randomUUID(),
      seq,
      type,
      timestamp: new Date().toISOString(),
      step_id: stepId,
      agent_id: agentId,
      payload,
    };
    if (type === "workflow_completed" || type === "workflow_failed") terminal = true;
    return event;
  };
}
