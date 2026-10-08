"use client";

import { useEffect, useState } from "react";
import type { WorkflowEvent } from "@/lib/workflow/types";

type RuntimeState = "idle" | "starting" | "ready" | "in_use" | "error";

type WarmupResponse = {
  status?: unknown;
  runtime?: unknown;
  model?: unknown;
  gpu?: unknown;
  warm_window_seconds?: unknown;
};

const DEFAULT_WARM_WINDOW_SECONDS = 150;

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type Runtime = {
  state: RuntimeState;
  expiresAt: number | null;
  now: number;
  expired: boolean;
  activeAgents: number;
};

type Tracked = {
  events: WorkflowEvent[];
  processedIds: ReadonlySet<string>;
  running: boolean;
};

function isAgentFinish(event: WorkflowEvent) {
  return event.type === "agent_completed" || event.type === "review_completed" || event.type === "agent_failed";
}

function readyWindow(runtime: Runtime, windowSeconds: number, current: number): Runtime {
  return { ...runtime, state: "ready", now: current, expiresAt: current + windowSeconds * 1000, expired: false, activeAgents: 0 };
}

// Rendering must stay pure, so a transition made during render leaves expiresAt empty;
// the countdown effect stamps the absolute expiry on its first tick.
function readyPending(runtime: Runtime): Runtime {
  return { ...runtime, state: "ready", expiresAt: null, expired: false, activeAgents: 0 };
}

export function ModelRuntimeControl({ events, running }: { events: WorkflowEvent[]; running: boolean }) {
  const [runtime, setRuntime] = useState<Runtime>(() => ({
    state: "idle",
    expiresAt: null,
    now: Date.now(),
    expired: false,
    activeAgents: 0,
  }));
  const [warmWindowSeconds, setWarmWindowSeconds] = useState(DEFAULT_WARM_WINDOW_SECONDS);
  const [tracked, setTracked] = useState<Tracked>(() => ({ events: [], processedIds: new Set(), running }));

  // Adjust state while rendering when the events or running props change.
  if (tracked.events !== events || tracked.running !== running) {
    let next = runtime;
    const processedIds = new Set(tracked.processedIds);

    for (const event of events) {
      if (processedIds.has(event.event_id)) continue;
      processedIds.add(event.event_id);

      if (event.type === "agent_started") {
        next = { ...next, state: "in_use", expiresAt: null, expired: false, activeAgents: next.activeAgents + 1 };
        continue;
      }

      if (isAgentFinish(event)) {
        const activeAgents = Math.max(0, next.activeAgents - 1);
        next = activeAgents === 0 ? readyPending(next) : { ...next, activeAgents };
      }
    }

    // Safety net: a run that ends without a matching finish event must not leave the runtime "In use".
    if (tracked.running && !running && next.state === "in_use") {
      next = readyPending(next);
    }

    setTracked({ events, processedIds, running });
    if (next !== runtime) setRuntime(next);
  }

  const { state, expiresAt, now, expired } = runtime;

  useEffect(() => {
    if (state !== "ready") return;

    const tick = () => {
      const current = Date.now();
      setRuntime((previous) => {
        if (previous.state !== "ready") return previous;
        const deadline = previous.expiresAt ?? current + warmWindowSeconds * 1000;
        return current >= deadline
          ? { ...previous, state: "idle", now: current, expiresAt: null, expired: true }
          : { ...previous, now: current, expiresAt: deadline };
      });
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [state, expiresAt, warmWindowSeconds]);

  async function warmModel() {
    if (state === "starting") return;

    setRuntime((previous) => ({ ...previous, state: "starting", expiresAt: null, expired: false }));

    try {
      const response = await fetch("/api/model/warmup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as WarmupResponse | null;

      if (!response.ok || payload?.status !== "ready") {
        throw new Error("warmup_failed");
      }

      const configuredWindow =
        typeof payload.warm_window_seconds === "number" && Number.isFinite(payload.warm_window_seconds)
          ? Math.max(1, Math.round(payload.warm_window_seconds))
          : DEFAULT_WARM_WINDOW_SECONDS;

      setWarmWindowSeconds(configuredWindow);
      const current = Date.now();
      setRuntime((previous) =>
        previous.activeAgents > 0 ? { ...previous, state: "in_use" } : readyWindow(previous, configuredWindow, current),
      );
    } catch {
      setRuntime((previous) => ({ ...previous, state: previous.activeAgents > 0 ? "in_use" : "error" }));
    }
  }

  const remaining = expiresAt === null ? null : formatRemaining(expiresAt - now);
  const ready = state === "ready";
  const inUse = state === "in_use";
  const starting = state === "starting";
  const error = state === "error";

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Model runtime</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${ready || inUse ? "text-emerald-700" : error ? "text-rose-700" : starting ? "text-indigo-700" : "text-slate-600"}`}>
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${ready || inUse ? "bg-emerald-500" : error ? "bg-rose-500" : starting ? "animate-pulse bg-indigo-500" : "border border-slate-400 bg-white"}`}
              />
              {starting ? "Starting model…" : ready ? "Ready" : inUse ? "In use" : error ? "Warmup failed" : "Idle"}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-700">qwen3:4b · NVIDIA L4 · Modal</p>
          <p className={`mt-1 text-[11px] leading-4 ${error ? "text-rose-700" : "text-slate-500"}`}>
            {starting
              ? "Starting the GPU runtime and loading qwen3:4b. Cold starts can take around a minute."
              : inUse
                ? "A Pegas agent is using the shared model runtime."
                : ready && remaining
                  ? `Auto scale-down window: ${remaining}`
                  : error
                    ? "Could not pre-warm the model. You can still run the demo; Modal will start automatically with the request."
                    : expired
                      ? "Warm window expired. Modal may scale to zero when idle."
                      : "GPU compute scales to zero when unused."}
          </p>
        </div>

        {!inUse && (
          <button
            type="button"
            onClick={warmModel}
            disabled={starting}
            aria-busy={starting}
            className="focus-ring shrink-0 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-[var(--pegas-blue-dark)] transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-60"
          >
            {starting ? "Starting…" : ready ? "Warm again" : "Wake model"}
          </button>
        )}
      </div>
    </div>
  );
}
