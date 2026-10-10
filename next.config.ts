import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Pegas receipt card runs in the MCP host's sandbox origin and imports the App bundle as a module, which needs CORS.
  headers() {
    return [{ source: "/mcp-app/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] }];
  },
};

export default nextConfig;
