export type Category =
  | "integration"
  | "support"
  | "partnership"
  | "marketing"
  | "media"
  | "billing"
  | "other";

export type Priority = "low" | "medium" | "high";

export type TriageResult = {
  category: Category;
  priority: Priority;
  summary: string;
  nextAction: string;
  model: string;
  compute: string;
  runtime: string;
  latencyMs: number | null;
  schemaValid: boolean | null;
  isPreview?: boolean;
};

export type BenchmarkCase = {
  id: number;
  message: string;
  expectedCategory: Category;
  expectedPriority: Priority;
};

export type UiErrorCode =
  | "MODEL_OFFLINE"
  | "MODEL_TIMEOUT"
  | "INVALID_MODEL_OUTPUT"
  | "INTERNAL_ERROR";

export type UiError = {
  code: UiErrorCode;
  title: string;
  message: string;
};
