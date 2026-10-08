import { createMcpHandler } from "mcp-handler";
import { MCP_SERVER_INFO, MCP_SERVER_INSTRUCTIONS, registerPegasTools } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

// MCP_SERVER_INFO also carries `title`; the adapter forwards serverInfo to McpServer unchanged.
const handler = createMcpHandler(registerPegasTools, { serverInfo: MCP_SERVER_INFO, instructions: MCP_SERVER_INSTRUCTIONS });

export { handler as GET, handler as POST, handler as DELETE };
