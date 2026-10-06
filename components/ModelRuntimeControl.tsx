"use client";

import { useEffect, useRef, useState } from "react";
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

export function ModelRuntimeControl({ events }: { events: WorkflowEvent[] }) {
  const [state, setState] = useState<RuntimeState>("idle");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [warmWindowSeconds, setWarmWindowSeconds] = useState(DEFAULT_WARM_WINDOW_SECONDS);
  const [expired, setExpired] = useState(false);
  const processedEventIds = useRef(new Set<string>());
  const activeAgents = useRef(0);

  useEffect(() => {
    for (const event of events) {
      if (processedEventIds.current.has(event.event_id)) continue;
      processedEventIds.current.add(event.event_id);

      if (event.type === "agent_started") {
        activeAgents.current += 1;
        setState("in_use");
        setExpiresAt(null);
        setExpired(false);
        continue;
      }

      if (event.type === "agent_completed" || event.type === "agent_failed") {
        activeAgents.current = Math.max(0, activeAgents.current - 1);
        if (activeAgents.current === 0) {
          const current = Date.now();
          setNow(current);
          setExpiresAt(current + warmWindowSeconds * 1000);
          setState("ready");
          setExpired(false);
        }
      }
    }
  }, [events, warmWindowSeconds]);

  useEffect(() => {
    if (state !== "ready" || expiresAt === null) return;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= expiresAt) {
        setExpiresAt(null);
        setState("idle");
        setExpired(true);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [state, expiresAt]);

  async function warmModel() {
    if (state === "starting") return;

    setState("starting");
    setExpiresAt(null);
    setExpired(false);

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
      if (activeAgents.current > 0) {
        setState("in_use");
        return;
      }

      const current = Date.now();
      setNow(current);
      setExpiresAt(current + configuredWindow * 1000);
      setState("ready");
    } catch {
      if (activeAgents.current > 0) {
        setState("in_use");
      } else {
        setState("error");
      }
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
