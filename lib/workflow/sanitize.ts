import type { Confidentiality } from "./types";

export type SanitizedInput = {
  sanitized: string;
  flagTypes: string[];
  confidentialityFloor: Confidentiality;
};

const marker = "[REDACTED_SECRET]";
const patterns: Array<{ type: string; regex: RegExp; replace: string }> = [
  { type: "password", regex: /(password\s*[:=]\s*)([^\s,;]+)/gi, replace: `$1${marker}` },
  { type: "api_key", regex: /((?:api[ _-]?key|apikey)\s*[:=]\s*)([^\s,;]+)/gi, replace: `$1${marker}` },
  { type: "bearer_token", regex: /((?:authorization\s*:\s*)?bearer\s+)([^\s,;]+)/gi, replace: `$1${marker}` },
  { type: "token_prefix", regex: /\b(sk-|ghp_|wk-|xoxb-|xoxp-|xoxa-|xoxr-)[A-Za-z0-9_\-]{6,}\b/g, replace: marker },
];

export function sanitizeRequest(input: string): SanitizedInput {
  let sanitized = input;
  const flags = new Set<string>();
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern.regex, (...args: unknown[]) => {
      flags.add(pattern.type);
      if (pattern.type === "token_prefix") return marker;
      const prefix = typeof args[1] === "string" ? args[1] : "";
      return `${prefix}${marker}`;
    });
  }
  return {
    sanitized,
    flagTypes: [...flags].sort(),
    confidentialityFloor: flags.size ? "restricted" : "internal",
  };
}
