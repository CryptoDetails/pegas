import "server-only";

import { TRIAGE_SYSTEM_PROMPT, wrapUntrustedBusinessMessage } from "./prompt";
import { triageSchema, validateTriageOutput, type ValidatedTriage } from "./schema";
import type { UiErrorCode } from "./types";

const REQUEST_TIMEOUT_MS = 120_000;

export class ModelAdapterError extends Error {
  code: UiErrorCode;

  constructor(code: UiErrorCode) {
    super(code);
    this.name = "ModelAdapterError";
    this.code = code;
  }
}

type OllamaEnvelope = {
  model?: unknown;
  response?: unknown;
};

export type OllamaResult = ValidatedTriage & {
  model: string;
  compute: string;
  runtime: "Ollama";
  latencyMs: number;
};

function readRequiredConfig() {
  const baseUrl = process.env.MODEL_BASE_URL?.trim();
  const model = process.env.OLLAMA_MODEL?.trim();
  const gpuLabel = process.env.GPU_LABEL?.trim();
  const authToken = process.env.MODEL_AUTH_TOKEN?.trim();

  if (!baseUrl || !model || !gpuLabel) {
    throw new ModelAdapterError("MODEL_ERROR");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model,
    gpuLabel,
    authToken,
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export async function runOllamaTriage(message: string): Promise<OllamaResult> {
  const { baseUrl, model, gpuLabel, authToken } = readRequiredConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        options: { temperature: 0 },
        format: triageSchema,
        system: TRIAGE_SYSTEM_PROMPT,
        prompt: wrapUntrustedBusinessMessage(message),
      }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (isAbortError(error)) throw new ModelAdapterError("MODEL_STARTING");
    if (error instanceof TypeError) throw new ModelAdapterError("MODEL_OFFLINE");
    throw new ModelAdapterError("MODEL_ERROR");
  } finally {
    clearTimeout(timeout);
  }

  const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));

  if (!response.ok) {
    if (response.status === 408 || response.status === 504) {
      throw new ModelAdapterError("MODEL_STARTING");
    }
    throw new ModelAdapterError("MODEL_ERROR");
  }

  let envelope: OllamaEnvelope;
  try {
    envelope = (await response.json()) as OllamaEnvelope;
  } catch {
    throw new ModelAdapterError("MODEL_ERROR");
  }

  if (typeof envelope.response !== "string") {
    throw new ModelAdapterError("MODEL_ERROR");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(envelope.response);
  } catch {
    throw new ModelAdapterError("MODEL_ERROR");
  }

  const triage = validateTriageOutput(parsed);
  if (!triage) throw new ModelAdapterError("MODEL_ERROR");

  return {
    ...triage,
    model: typeof envelope.model === "string" && envelope.model.trim() ? envelope.model : model,
    compute: gpuLabel,
    runtime: "Ollama",
    latencyMs,
  };
}
