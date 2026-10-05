import { AppHeader } from "@/components/AppHeader";
import { WorkflowEvaluationDashboard } from "@/components/WorkflowEvaluationDashboard";
import rawCases from "@/data/workflow-evaluation-v1.json";
import type { WorkflowEvaluationCase } from "@/lib/workflow/evaluation";

export default function EvaluationPage(){
  return <div className="min-h-screen"><AppHeader active="build"/><main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14"><WorkflowEvaluationDashboard cases={rawCases as WorkflowEvaluationCase[]}/></main></div>;
}
