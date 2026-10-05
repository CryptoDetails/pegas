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

export type StructuredModelErrorCode =
  | "MODEL_OFFLINE"
  | "MODEL_TIMEOUT"
  | "MODEL_ERROR"
  | "INVALID_OUTPUT";

export class StructuredModelError extends Error {
  code: StructuredModelErrorCode;
  backendResponseReceived: boolean;

  constructor(code: StructuredModelErrorCode, backendResponseReceived = false) {
    super(code);
    this.name = "StructuredModelError";
    this.code = code;
    this.backendResponseReceived = backendResponseReceived;
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

type StructuredModelOptions<T> = {
  systemPrompt: string;
  prompt: string;
  schema: unknown;
  validator: (value: unknown) => T | null;
  signal?: AbortSignal;
  timeoutMs: number;
  maxOutputTokens: number;
};

function readModelConfig() {
  const baseUrl = process.env.MODEL_BASE_URL?.trim();
  const model = process.env.OLLAMA_MODEL?.trim();
  const authToken = process.env.MODEL_AUTH_TOKEN?.trim();

  if (!baseUrl || !model) {
    throw new StructuredModelError("MODEL_ERROR");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model,
    authToken,
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function parseStructuredJson(raw: string): unknown {
  const trimmed = raw.trim();
  const attempts: string[] = [trimmed];

  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch?.[1]) attempts.push(fenceMatch[1].trim());

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    attempts.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next safe extraction strategy.
    }
  }

  throw new StructuredModelError("INVALID_OUTPUT", true);
}

export async function runStructuredModel<T>(
  options: StructuredModelOptions<T>,
): Promise<{ value: T; model: string; latencyMs: number }> {
  const { baseUrl, model, authToken } = readModelConfig();
  const timeoutMs = Math.max(1, Math.min(REQUEST_TIMEOUT_MS, options.timeoutMs));
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onParentAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
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
          options: {
            temperature: 0,
            num_predict: Math.min(600, options.maxOutputTokens),
          },
          format: options.schema,
          system: options.systemPrompt,
          prompt: options.prompt,
        }),
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error) {
      if (isAbortError(error)) throw new StructuredModelError("MODEL_TIMEOUT");
      if (error instanceof TypeError) throw new StructuredModelError("MODEL_OFFLINE");
      throw new StructuredModelError("MODEL_ERROR");
    }

    if (!response.ok) {
      if (response.status === 408 || response.status === 504) {
        throw new StructuredModelError("MODEL_TIMEOUT", true);
      }
      throw new StructuredModelError("MODEL_ERROR", true);
    }

    let envelope: OllamaEnvelope;
    try {
      envelope = (await response.json()) as OllamaEnvelope;
    } catch {
      throw new StructuredModelError("MODEL_ERROR", true);
    }

    if (typeof envelope.response !== "string") {
      throw new StructuredModelError("INVALID_OUTPUT", true);
    }

    const parsed = parseStructuredJson(envelope.response);
    const value = options.validator(parsed);
    if (!value) throw new StructuredModelError("INVALID_OUTPUT", true);

    return {
      value,
      model:
        typeof envelope.model === "string" && envelope.model.trim()
          ? envelope.model
          : model,
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onParentAbort);
  }
}

export async function runOllamaTriage(message: string): Promise<OllamaResult> {
  try {
    const gpuLabel = process.env.GPU_LABEL?.trim();
    if (!gpuLabel) throw new StructuredModelError("MODEL_ERROR");

    const result = await runStructuredModel({
      systemPrompt: TRIAGE_SYSTEM_PROMPT,
      prompt: wrapUntrustedBusinessMessage(message),
      schema: triageSchema,
      validator: validateTriageOutput,
      timeoutMs: REQUEST_TIMEOUT_MS,
      maxOutputTokens: 600,
    });

    return {
      ...result.value,
      model: result.model,
      compute: gpuLabel,
      runtime: "Ollama",
      latencyMs: result.latencyMs,
    };
  } catch (error) {
    if (error instanceof StructuredModelError) {
      if (error.code === "MODEL_TIMEOUT") throw new ModelAdapterError("MODEL_STARTING");
      if (error.code === "MODEL_OFFLINE") throw new ModelAdapterError("MODEL_OFFLINE");
      throw new ModelAdapterError("MODEL_ERROR");
    }
    throw new ModelAdapterError("MODEL_ERROR");
  }
}
