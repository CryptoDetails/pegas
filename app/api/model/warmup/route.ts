import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const WARMUP_TIMEOUT_MS = 120_000;

type ModalWarmupResponse = {
  status?: unknown;
  runtime?: unknown;
  model?: unknown;
  gpu?: unknown;
  warm_window_seconds?: unknown;
};

export async function POST() {
  const baseUrl = process.env.MODEL_BASE_URL?.trim().replace(/\/+$/, "");
  const authToken = process.env.MODEL_AUTH_TOKEN?.trim();

  if (!baseUrl || !authToken) {
    return NextResponse.json(
      { status: "error", message: "Model runtime is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${baseUrl}/warmup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { status: "error", message: "Model warmup did not complete." },
        { status: upstream.status === 504 ? 504 : 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload = (await upstream.json()) as ModalWarmupResponse;
    if (payload.status !== "ready") {
      return NextResponse.json(
        { status: "error", message: "Model warmup returned an unexpected status." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        status: "ready",
        runtime: typeof payload.runtime === "string" ? payload.runtime : null,
        model: typeof payload.model === "string" ? payload.model : null,
        gpu: typeof payload.gpu === "string" ? payload.gpu : null,
        warm_window_seconds:
          typeof payload.warm_window_seconds === "number" && Number.isFinite(payload.warm_window_seconds)
            ? payload.warm_window_seconds
            : 150,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        status: "error",
        message: timedOut ? "Model warmup timed out." : "Model warmup request failed.",
      },
      { status: timedOut ? 504 : 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timeout);
  }
}
