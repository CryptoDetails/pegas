import { createHash } from "node:crypto";
import type { AgentMandate } from "./types";
import type { PaymentConfig } from "./config";

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function mandateAuthorityFields(m: Omit<AgentMandate,"fingerprint_sha256">) {
  return { mandate_id:m.mandate_id, operation_id:m.operation_id, principal:m.principal, acting_agent:m.acting_agent, service_id:m.service_id, purpose:m.purpose, counterparty_agent_id:m.counterparty_agent_id, allowed_payee:m.allowed_payee, network:m.network, asset_mint:m.asset_mint, max_amount_atomic:m.max_amount_atomic, max_authorizations:m.max_authorizations, created_at:m.created_at, expires_at:m.expires_at };
}
export function fingerprintMandate(m: Omit<AgentMandate,"fingerprint_sha256">) { return createHash("sha256").update(stable(mandateAuthorityFields(m))).digest("hex"); }
export function createAgentMandate(args:{ operationId:string; purpose:string; absoluteDeadline:number; config:PaymentConfig; now?:number }):AgentMandate {
  const now=args.now ?? Date.now(); const expires=Math.min(args.absoluteDeadline, now+120_000);
  const base:Omit<AgentMandate,"fingerprint_sha256">={ mandate_id:`mand_${crypto.randomUUID()}`, operation_id:args.operationId, principal:{type:"application",id:"pegas-request-desk",label:"Pegas Request Desk"}, acting_agent:{agent_id:"pegas:routing-agent:v1",role:"routing_agent"}, service_id:"legal_consultation", purpose:args.purpose.slice(0,300), counterparty_agent_id:"pegas:legal-advisor:v1", allowed_payee:args.config.legalPayTo, network:args.config.network, asset_mint:args.config.assetMint, max_amount_atomic:"10000", max_authorizations:1, created_at:new Date(now).toISOString(), expires_at:new Date(expires).toISOString(), state:"active" };
  return {...base,fingerprint_sha256:fingerprintMandate(base)};
}
export function withMandateState(m:AgentMandate,state:AgentMandate["state"]):AgentMandate { return {...m,state}; }
