import { NextResponse } from "next/server";
import { ModelAdapterError, runOllamaTriage } from "@/lib/ollama";
import type { TriageResult, UiError, UiErrorCode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function errorResponse(code: UiErrorCode, status: number) {
  return NextResponse.json(
    { error: errors[code] },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INTERNAL_ERROR", 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof body.message !== "string" ||
    !body.message.trim()
  ) {
    return errorResponse("INTERNAL_ERROR", 400);
  }

  try {
    const result = await runOllamaTriage(body.message.trim());
    const payload: TriageResult = {
      category: result.category,
      priority: result.priority,
      summary: result.summary,
      nextAction: result.nextAction,
      model: result.model,
      compute: result.compute,
      runtime: result.runtime,
      latencyMs: result.latencyMs,
      schemaValid: true,
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ModelAdapterError) {
      const status = error.code === "MODEL_TIMEOUT" ? 504 : error.code === "MODEL_OFFLINE" ? 503 : 502;
      return errorResponse(error.code, status);
    }
    return errorResponse("INTERNAL_ERROR", 500);
  }
}
