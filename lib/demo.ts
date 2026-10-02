import type { Category, Priority, TriageResult, UiError, UiErrorCode } from "./types";

export const PREVIEW_DELAY_MS = 1800;

function hasAny(message: string, words: string[]) {
  return words.some((word) => message.includes(word));
}

function previewCategory(message: string): Category {
  const lower = message.toLowerCase();
  if (hasAny(lower, ["invoice", "billing", "payment due", "accounting"])) return "billing";
  if (hasAny(lower, ["podcast", "interview", "press", "journalist", "article", "quote"])) return "media";
  if (hasAny(lower, ["giveaway", "campaign", "co-marketing", "brand guidelines", "social post"])) return "marketing";
  if (hasAny(lower, ["partner", "partnership", "commercial terms", "referral program"])) return "partnership";
  if (hasAny(lower, ["api", "sdk", "endpoint", "sandbox", "integrat"])) return "integration";
  if (hasAny(lower, ["cannot access", "crash", "error", "help", "funds have not arrived", "recover"])) return "support";
  return "other";
}

function previewPriority(message: string): Priority {
  const lower = message.toLowerCase();
  if (hasAny(lower, ["as soon as possible", "today", "tomorrow", "deadline", "cannot access", "blocked", "funds have not arrived", "crash"])) return "high";
  if (hasAny(lower, ["could you", "would like", "need", "please", "can you"])) return "medium";
  return "low";
}

export function createPreviewResult(message: string): TriageResult {
  return {
    category: previewCategory(message),
    priority: previewPriority(message),
    summary: "Local UI preview showing how a structured model result will appear after the live GPU connection is enabled.",
    nextAction: "Complete the infrastructure proof run, then route this same interaction through the self-hosted Qwen3 endpoint.",
    model: "UI preview",
    compute: "Not connected",
    runtime: "Ollama (planned)",
    latencyMs: null,
    schemaValid: null,
    isPreview: true,
  };
}

const errors: Record<UiErrorCode, UiError> = {
  MODEL_OFFLINE: {
    code: "MODEL_OFFLINE",
    title: "Model offline",
    message: "The cloud GPU model is currently unavailable. This is expected when the paid GPU instance is stopped between demo sessions.",
  },
  MODEL_TIMEOUT: {
    code: "MODEL_TIMEOUT",
    title: "Request timed out",
    message: "The model took too long to respond. Please try again after the GPU endpoint is ready.",
  },
  INVALID_MODEL_OUTPUT: {
    code: "INVALID_MODEL_OUTPUT",
    title: "Invalid model response",
    message: "The model returned data that did not pass the expected structured-output schema.",
  },
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    title: "Something went wrong",
    message: "Pegas could not complete the request. Infrastructure details remain hidden from the browser.",
  },
};

export function getPreviewError(code: UiErrorCode): UiError {
  return errors[code];
}
