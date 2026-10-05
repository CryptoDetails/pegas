import type { AgentRegistryEntry } from "./types";
import type { PaymentConfig } from "./config";

export function getAgentRegistry(config: PaymentConfig): readonly AgentRegistryEntry[] {
  return [
    { agent_id: "pegas:routing-agent:v1", operator: "Pegas", role: "routing_agent", environment: "demo", status: "registered", allowed_services: ["legal_consultation"], payment_address: config.buyerAddress || null, protocol: "x402", network: config.network },
    { agent_id: "pegas:legal-advisor:v1", operator: "Pegas", role: "legal_advisor_agent", environment: "demo", status: "registered", allowed_services: ["legal_consultation"], payment_address: config.legalPayTo || null, protocol: "x402", network: config.network },
  ] as const;
}
export function resolveAgent(config: PaymentConfig, id: AgentRegistryEntry["agent_id"]) { return getAgentRegistry(config).find((entry) => entry.agent_id === id) ?? null; }
export function verifyRegistryBindings(config: PaymentConfig) {
  const buyer = resolveAgent(config, "pegas:routing-agent:v1"); const seller = resolveAgent(config, "pegas:legal-advisor:v1");
  const errors: string[] = [];
  if (!buyer || buyer.status !== "registered" || buyer.payment_address !== config.buyerAddress) errors.push("buyer registry binding mismatch");
  if (!seller || seller.status !== "registered" || seller.payment_address !== config.legalPayTo) errors.push("Legal Advisor registry binding mismatch");
  if (!seller?.allowed_services.includes("legal_consultation")) errors.push("Legal Advisor is not registered for legal_consultation");
  return { ok: errors.length === 0, errors, buyer, seller };
}
