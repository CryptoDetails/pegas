// Minimal MCP client for the browser: JSON-RPC over Streamable HTTP to the same-origin /api/mcp. No SDK.

export const MCP_PROTOCOL_VERSION = "2025-06-18";
const ENDPOINT = "/api/mcp";
const RAW_LIMIT = 3000;

export type JsonRpcError = { code: number; message: string; data?: unknown };
export type JsonRpcMessage = { jsonrpc: "2.0"; id?: string | number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: JsonRpcError };
export type McpTraffic = { direction: "out" | "in"; method: string; summary: string; raw: string; kind: "request" | "response" | "notification" | "error" };
export type McpProgress = { progress?: number; message?: string; _meta?: Record<string, unknown> };
export type McpToolCallResult = { content?: Array<{ type: string; text?: string }>; structuredContent?: Record<string, unknown>; isError?: boolean };

// Every failure is a value: JSON-RPC error, HTTP error, transport error or a stream that ended without a response.
export type McpOutcome<T> =
  | { ok: true; result: T }
  | { ok: false; kind: "rpc" | "http" | "transport" | "no_result" | "aborted"; message: string };

type Options = { onTraffic?: (entry: McpTraffic) => void; signal?: AbortSignal };
type Summarize = (message: JsonRpcMessage) => string;

const truncate = (value: string) => (value.length > RAW_LIMIT ? `${value.slice(0, RAW_LIMIT)}… [truncated]` : value);

export class BrowserMcpClient {
  private sessionId: string | null = null;
  private nextId = 1;
  private readonly options: Options;
  constructor(options: Options = {}) { this.options = options; }

  private report(entry: Omit<McpTraffic, "raw"> & { raw: unknown }) {
    try { this.options.onTraffic?.({ ...entry, raw: truncate(JSON.stringify(entry.raw, null, 2)) }); } catch { /* transcript is best effort */ }
  }

  private async post(body: JsonRpcMessage): Promise<Response> {
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": MCP_PROTOCOL_VERSION };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    const response = await fetch(ENDPOINT, { method: "POST", headers, body: JSON.stringify(body), signal: this.options.signal });
    const session = response.headers.get("mcp-session-id");
    if (session) this.sessionId = session;
    return response;
  }

  async request<T>(method: string, params: Record<string, unknown>, opts: { label?: string; summary?: string; summarize?: Summarize; onProgress?: (p: McpProgress) => void } = {}): Promise<McpOutcome<T>> {
    const id = this.nextId++;
    const label = opts.label ?? method;
    const message: JsonRpcMessage = { jsonrpc: "2.0", id, method, params };
    this.report({ direction: "out", kind: "request", method: label, summary: opts.summary ?? method, raw: message });
    try {
      const response = await this.post(message);
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const failure = `HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`;
        this.report({ direction: "in", kind: "error", method: label, summary: failure, raw: { status: response.status, body: text } });
        return { ok: false, kind: "http", message: failure };
      }
      const reply = await this.readReply(response, id, opts.onProgress);
      if (!reply) {
        this.report({ direction: "in", kind: "error", method: label, summary: "Stream ended without a response", raw: { id } });
        return { ok: false, kind: "no_result", message: "The MCP stream ended before a result." };
      }
      if (reply.error) {
        this.report({ direction: "in", kind: "error", method: label, summary: `Error ${reply.error.code}: ${reply.error.message}`, raw: reply });
        return { ok: false, kind: "rpc", message: reply.error.message };
      }
      this.report({ direction: "in", kind: "response", method: "result", summary: opts.summarize?.(reply) ?? `${label} result`, raw: reply });
      return { ok: true, result: reply.result as T };
    } catch (err) {
      if (this.options.signal?.aborted) return { ok: false, kind: "aborted", message: "The MCP call was aborted." };
      const failure = err instanceof Error ? err.message : "MCP transport failed.";
      this.report({ direction: "in", kind: "error", method: label, summary: failure, raw: { error: failure } });
      return { ok: false, kind: "transport", message: failure };
    }
  }

  async notify(method: string, params?: Record<string, unknown>) {
    const message: JsonRpcMessage = { jsonrpc: "2.0", method, ...(params ? { params } : {}) };
    this.report({ direction: "out", kind: "notification", method, summary: method, raw: message });
    try {
      const response = await this.post(message);
      await response.body?.cancel().catch(() => undefined);
    } catch { /* a notification has no reply to wait for */ }
  }

  private async readReply(response: Response, id: number, onProgress?: (p: McpProgress) => void): Promise<JsonRpcMessage | null> {
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("application/json")) {
      const data = (await response.json()) as JsonRpcMessage | JsonRpcMessage[];
      const list = Array.isArray(data) ? data : [data];
      return list.find((m) => m.id === id) ?? null;
    }
    if (!type.includes("text/event-stream") || !response.body) return null;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let reply: JsonRpcMessage | null = null;
    const handle = (line: string) => {
      if (!line.startsWith("data:")) return;
      const payload = line.slice(5).trim();
      if (!payload) return;
      let message: JsonRpcMessage;
      try { message = JSON.parse(payload) as JsonRpcMessage; } catch { return; }
      if (message.method === "notifications/progress") {
        const params = (message.params ?? {}) as McpProgress;
        this.report({ direction: "in", kind: "notification", method: "progress", summary: params.message ?? `progress ${params.progress ?? ""}`, raw: message });
        try { onProgress?.(params); } catch { /* UI callback must not break the stream */ }
      } else if (message.id === id && (message.result !== undefined || message.error)) {
        reply = message;
      } else if (message.method) {
        this.report({ direction: "in", kind: "notification", method: message.method, summary: message.method, raw: message });
      }
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) handle(line);
      if (reply) { await reader.cancel().catch(() => undefined); break; }
    }
    if (!reply && buffer) handle(buffer);
    return reply;
  }

  async initialize(summarize?: Summarize) {
    const result = await this.request<{ serverInfo?: { name?: string; version?: string }; protocolVersion?: string }>(
      "initialize",
      { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "pegas-demo-agent", version: "1.0.0" } },
      { summary: "Hello, I am pegas-demo-agent 1.0.0", summarize },
    );
    if (result.ok) await this.notify("notifications/initialized");
    return result;
  }

  listTools(summarize?: Summarize) {
    return this.request<{ tools?: Array<{ name: string }> }>("tools/list", {}, { summary: "Which tools do you offer?", summarize });
  }

  callTool(name: string, args: Record<string, unknown>, opts: { onProgress?: (p: McpProgress) => void; summarize?: Summarize; summary?: string } = {}) {
    const progressToken = `pegas-demo-${crypto.randomUUID()}`;
    return this.request<McpToolCallResult>(
      "tools/call",
      { name, arguments: args, _meta: { progressToken } },
      { label: `tools/call · ${name}`, summary: opts.summary ?? `Calling ${name}`, summarize: opts.summarize, onProgress: opts.onProgress },
    );
  }
}
