import { DEVNET_USDC_MINT, LEGAL_AMOUNT_ATOMIC, SOLANA_DEVNET_CAIP2 } from "./types.ts";
import { isSolanaPublicKey } from "./solana-utils.ts";

export type PaymentConfig = {
  enabled: boolean;
  facilitatorUrl: string;
  network: typeof SOLANA_DEVNET_CAIP2;
  assetMint: string;
  rpcUrl: string;
  buyerPrivateKey: string;
  buyerAddress: string;
  legalPayTo: string;
  legalServiceBaseUrl: string;
  legalServiceAuthSecret: string;
  amountAtomic: "10000";
  maxPerOperationAtomic: "10000";
  maxDailyAtomic: bigint;
  maxPerSessionAtomic: bigint;
  redisUrl: string;
  redisToken: string;
};

function value(name: string) { return process.env[name]?.trim() ?? ""; }
function positiveAtomic(name: string, fallback: string) {
  const raw = value(name) || fallback;
  if (!/^\d+$/.test(raw) || BigInt(raw) <= 0n) throw new Error(`${name} must be a positive atomic integer.`);
  return BigInt(raw);
}

export function readPaymentConfig(): PaymentConfig {
  const network = (value("SOLANA_NETWORK") || SOLANA_DEVNET_CAIP2) as typeof SOLANA_DEVNET_CAIP2;
  const amount = value("LEGAL_CONSULTATION_AMOUNT_ATOMIC") || LEGAL_AMOUNT_ATOMIC;
  const maxOp = value("PAYMENT_MAX_PER_OPERATION_ATOMIC") || LEGAL_AMOUNT_ATOMIC;
  return {
    enabled: value("AGENTIC_PAYMENTS_ENABLED") === "true",
    facilitatorUrl: value("X402_FACILITATOR_URL") || "https://x402.org/facilitator",
    network,
    assetMint: value("SOLANA_USDC_MINT") || DEVNET_USDC_MINT,
    rpcUrl: value("SOLANA_RPC_URL"),
    buyerPrivateKey: value("PAYMENT_BUYER_PRIVATE_KEY"),
    buyerAddress: value("PAYMENT_BUYER_ADDRESS"),
    legalPayTo: value("LEGAL_PAY_TO"),
    legalServiceBaseUrl: value("LEGAL_SERVICE_BASE_URL"),
    legalServiceAuthSecret: value("LEGAL_SERVICE_AUTH_SECRET"),
    amountAtomic: amount as "10000",
    maxPerOperationAtomic: maxOp as "10000",
    maxDailyAtomic: positiveAtomic("PAYMENT_MAX_DAILY_ATOMIC", "100000"),
    maxPerSessionAtomic: positiveAtomic("PAYMENT_MAX_PER_SESSION_ATOMIC", "30000"),
    redisUrl: value("UPSTASH_REDIS_REST_URL"),
    redisToken: value("UPSTASH_REDIS_REST_TOKEN"),
  };
}

export function validatePaymentConfig(config = readPaymentConfig(), options:{requireEnabled?:boolean}={}) {
  const errors: string[] = [];
  if ((options.requireEnabled ?? true) && !config.enabled) errors.push("AGENTIC_PAYMENTS_ENABLED is not true");
  if (config.network !== SOLANA_DEVNET_CAIP2) errors.push("SOLANA_NETWORK must be the required Solana Devnet CAIP-2 identifier");
  if (config.assetMint !== DEVNET_USDC_MINT) errors.push("SOLANA_USDC_MINT must be the configured Devnet USDC mint");
  if (config.amountAtomic !== LEGAL_AMOUNT_ATOMIC || config.maxPerOperationAtomic !== LEGAL_AMOUNT_ATOMIC) errors.push("legal amount and per-operation ceiling must both equal 10000 atomic");
  for (const [name, v] of [["SOLANA_RPC_URL",config.rpcUrl],["PAYMENT_BUYER_PRIVATE_KEY",config.buyerPrivateKey],["PAYMENT_BUYER_ADDRESS",config.buyerAddress],["LEGAL_PAY_TO",config.legalPayTo],["LEGAL_SERVICE_BASE_URL",config.legalServiceBaseUrl],["LEGAL_SERVICE_AUTH_SECRET",config.legalServiceAuthSecret],["UPSTASH_REDIS_REST_URL",config.redisUrl],["UPSTASH_REDIS_REST_TOKEN",config.redisToken]] as const) if (!v) errors.push(`${name} is required`);
  if (config.buyerAddress && config.legalPayTo && config.buyerAddress === config.legalPayTo) errors.push("buyer and seller addresses must differ");
  if (config.buyerAddress && !isSolanaPublicKey(config.buyerAddress)) errors.push("PAYMENT_BUYER_ADDRESS must be a valid Solana public key");
  if (config.legalPayTo && !isSolanaPublicKey(config.legalPayTo)) errors.push("LEGAL_PAY_TO must be a valid Solana public key");
  if (config.legalServiceBaseUrl) {
    try { const u = new URL(config.legalServiceBaseUrl); if (u.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"))) errors.push("LEGAL_SERVICE_BASE_URL must use HTTPS outside local development"); } catch { errors.push("LEGAL_SERVICE_BASE_URL must be an absolute URL"); }
  }
  return { ok: errors.length === 0, errors, config } as const;
}
