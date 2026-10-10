import type { McpServer, ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";
import { RECEIPT_HTML, RECEIPT_MIME_TYPE, RECEIPT_RESOURCE_META, RECEIPT_TOOL_META, RECEIPT_URI } from "./receipt-app";
import { readPaymentEvidenceForMcp, runPaidLegalForMcp, runStandardForMcp, type ProgressFn } from "./run";

export const MCP_SERVER_INFO = { name: "pegas", title: "Pegas", version: "0.3.0" };

export const MCP_SERVER_INSTRUCTIONS = [
  "Pegas is a multi-agent Request Desk. It runs its own open-weight model (qwen3:4b on Modal) that scales to zero, so the first call can take 60-90 seconds.",
  "submit_request runs the free standard routing flow. request_legal_consultation buys one Legal consultation for 0.01 test USDC on Solana Devnet under Pegas' own bounded mandate: never real money, and the caller never holds payment authority (no keys, no signing, no control over price, seller, network or asset).",
  "get_payment_evidence returns stored evidence for an operation_id from a paid call.",
  "Do not send secrets or personal data.",
].join("\n");

const MAX_PROGRESS = 80;

function progressFor(ctx: ServerContext): ProgressFn | undefined {
  const token = ctx.mcpReq._meta?.progressToken;
  if (token === undefined) return undefined;
  let sent = 0;
  return (message, step) => {
    if (sent >= MAX_PROGRESS) return;
    sent += 1;
    void ctx.mcpReq.notify({ method: "notifications/progress", params: { progressToken: token, progress: sent, message, _meta: { "pegas/step": step } } }).catch(() => undefined);
  };
}

const message = z.string().trim().min(1).max(4000).describe("The request for Pegas, in plain language. No secrets or personal data.");
const agentName = z.string().optional().describe('Name of the calling assistant or product, for example "Claude" or "Cursor". Self-declared and not verified; shown in the Pegas receipt.');

export function registerPegasTools(server: McpServer) {
  // MCP Apps hosts render this card for the two workflow tools; text-only clients ignore it.
  server.registerResource(
    "Pegas receipt",
    RECEIPT_URI,
    { title: "Pegas receipt", description: "Inline receipt card for Pegas tool results.", mimeType: RECEIPT_MIME_TYPE, _meta: RECEIPT_RESOURCE_META },
    async () => ({ contents: [{ uri: RECEIPT_URI, mimeType: RECEIPT_MIME_TYPE, text: RECEIPT_HTML, _meta: RECEIPT_RESOURCE_META }] }),
  );

  server.registerTool(
    "submit_request",
    {
      title: "Submit a request to Pegas Request Desk",
      description: "Run the free standard Pegas workflow (Intake, Privacy, Routing, Reviewer) and get a routed request card. Spends nothing.",
      inputSchema: z.object({ message, agent_name: agentName }),
      annotations: { title: "Submit a request to Pegas Request Desk", readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: RECEIPT_TOOL_META,
    },
    async ({ message, agent_name }, ctx) => runStandardForMcp({ message, agentName: agent_name, signal: ctx.mcpReq.signal, progress: progressFor(ctx) }),
  );

  server.registerTool(
    "request_legal_consultation",
    {
      title: "Buy one Legal consultation (0.01 test USDC, Solana Devnet)",
      description: "Run the paid Pegas workflow. If Routing selects Legal, Pegas buys one Legal consultation for 0.01 test USDC on Solana Devnet under its own bounded mandate, subject to deterministic policy (AUTH-01..AUTH-10) and on-chain evidence. The caller holds no payment authority.",
      inputSchema: z.object({
        message,
        agent_name: agentName,
        request_id: z.string().min(8).max(128).optional().describe("Optional idempotency key. Reusing it with the same message replays the stored result without a new payment."),
      }),
      annotations: { title: "Buy one Legal consultation (0.01 test USDC, Solana Devnet)", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      _meta: RECEIPT_TOOL_META,
    },
    async ({ message, agent_name, request_id }, ctx) => runPaidLegalForMcp({ message, agentName: agent_name, requestId: request_id, signal: ctx.mcpReq.signal, progress: progressFor(ctx) }),
  );

  server.registerTool(
    "get_payment_evidence",
    {
      title: "Get stored payment evidence",
      description: "Read the stored mandate, policy and settlement evidence for an operation_id returned by request_legal_consultation. Read-only; no chain recheck.",
      inputSchema: z.object({ operation_id: z.string().regex(/^op_[0-9a-f-]{36}$/).describe("operation_id from a request_legal_consultation result.") }),
      annotations: { title: "Get stored payment evidence", readOnlyHint: true, openWorldHint: false },
    },
    async ({ operation_id }) => readPaymentEvidenceForMcp(operation_id),
  );
}
