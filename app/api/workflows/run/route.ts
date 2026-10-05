import { runWorkflow } from "@/lib/workflow/orchestrator";
import type { WorkflowEvent } from "@/lib/workflow/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

function invalidInput(message: string) {
  return Response.json({ error: { code: "INVALID_INPUT", message } }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return invalidInput("Request body must be valid JSON."); }
  if (typeof body !== "object" || body === null || !("message" in body) || typeof body.message !== "string") return invalidInput("message must be a string.");
  const message = body.message.trim();
  if (!message) return invalidInput("message must not be empty.");
  if (message.length > 4000) return invalidInput("message must be 4,000 characters or fewer.");

  const encoder = new TextEncoder();
  let terminal = false;
  const runController = new AbortController();
  const abortRun = () => runController.abort();
  request.signal.addEventListener("abort", abortRun, { once: true });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: WorkflowEvent) => {
        if (terminal) return;
        try { controller.enqueue(encoder.encode(`event: workflow_event\ndata: ${JSON.stringify(event)}\n\n`)); } catch { return; }
        if (event.type === "workflow_completed" || event.type === "workflow_failed") terminal = true;
      };
      void runWorkflow(message, send, runController.signal).finally(() => {
        request.signal.removeEventListener("abort", abortRun);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() { runController.abort(); },
  });

  return new Response(stream, { status: 200, headers: { "Content-Type":"text/event-stream; charset=utf-8", "Cache-Control":"no-store, no-transform", Connection:"keep-alive", "X-Accel-Buffering":"no" } });
}
