import { x402Client } from "@x402/core/client";
import { x402HTTPClient } from "@x402/core/http";
import type { PaymentRequired } from "@x402/core/types";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { toClientSvmSigner } from "@x402/svm";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import type { PaymentConfig } from "./config";
import type { X402PaymentRequired } from "./types";
import { decodeBase58 } from "./solana-utils.ts";

/**
 * Production x402 SDK binding. Kept behind a local lazy import in x402-client.ts so
 * source-only deterministic tests can inject a signer without requiring node_modules,
 * while Next's module graph still sees these official package imports for deployment.
 */
function isCaip2Network(value: string): value is `${string}:${string}` {
  const separator = value.indexOf(":");
  return separator > 0 && separator < value.length - 1;
}

function assertOfficialPaymentRequired(required: X402PaymentRequired): asserts required is X402PaymentRequired & PaymentRequired {
  if (!required.accepts.every(option => isCaip2Network(option.network))) {
    throw new Error("x402 payment requirement network must be CAIP-2");
  }
}

export async function createX402SvmSdk(config: PaymentConfig) {
  const secret = decodeBase58(config.buyerPrivateKey, "PAYMENT_BUYER_PRIVATE_KEY");
  if (secret.length !== 64) throw new Error(`PAYMENT_BUYER_PRIVATE_KEY must decode to 64 bytes; got ${secret.length}`);
  const keypair = await createKeyPairSignerFromBytes(secret);
  if (String(keypair.address) !== config.buyerAddress) throw new Error("PAYMENT_BUYER_PRIVATE_KEY does not match PAYMENT_BUYER_ADDRESS");

  const signer = toClientSvmSigner(keypair);
  const client = new x402Client();
  registerExactSvmScheme(client, { signer });
  const httpClient = new x402HTTPClient(client);

  return {
    createPaymentPayload: (required: X402PaymentRequired) => {
      assertOfficialPaymentRequired(required);
      return client.createPaymentPayload(required);
    },
    encodePaymentSignatureHeader: (payload: unknown) => httpClient.encodePaymentSignatureHeader(payload as Parameters<typeof httpClient.encodePaymentSignatureHeader>[0]),
  };
}
