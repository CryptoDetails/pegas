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

export type BenchmarkRunResult = {
  caseId: number;
  category: Category | null;
  priority: Priority | null;
  summary: string | null;
  nextAction: string | null;
  validOutput: boolean;
  latencyMs: number;
  errorCode: UiErrorCode | null;
};

export type UiErrorCode =
  | "MODEL_OFFLINE"
  | "MODEL_STARTING"
  | "MODEL_ERROR";

export type UiError = {
  code: UiErrorCode;
  title: string;
  message: string;
};

export type ProofResponse = {
  proofTimestamp: string;
  modelEndpointReachable: boolean;
  configuredCompute?: string;
  configuredModel?: string;
  ollamaVersion?: string;
  configuredModelPresent?: boolean;
  loadedModel?: {
    name: string;
    sizeBytes?: number;
    sizeVramBytes?: number;
  };
  deploymentCommitSha?: string;
};
