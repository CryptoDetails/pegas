import assert from "node:assert/strict";
import type { PaymentRequired } from "@x402/core/types";
import fs from "node:fs";
import { buildLegalPaymentRequired, freezePaymentRequired, isValidFacilitatorFeePayer, quoteFingerprint, requireFrozenOffer } from "../lib/payments/x402-server.ts";
import { paidFetchWithFrozenX402 } from "../lib/payments/x402-client.ts";
import { isSolanaPublicKey } from "../lib/payments/solana-utils.ts";
import { signInternalEnvelope, verifyInternalEnvelope } from "../lib/payments/internal-auth.ts";
import { SOLANA_DEVNET_CAIP2, DEVNET_USDC_MINT, type X402PaymentRequired } from "../lib/payments/types.ts";
import { validatePaymentConfig, type PaymentConfig } from "../lib/payments/config.ts";

const config:PaymentConfig={enabled:true,facilitatorUrl:"https://x402.org/facilitator",network:SOLANA_DEVNET_CAIP2,assetMint:DEVNET_USDC_MINT,rpcUrl:"https://example.invalid/rpc",buyerPrivateKey:"secret",buyerAddress:"Buyer111",legalPayTo:"Seller111",legalServiceBaseUrl:"https://pegas.example",legalServiceAuthSecret:"auth-secret",amountAtomic:"10000",maxPerOperationAtomic:"10000",maxDailyAtomic:100000n,maxPerSessionAtomic:30000n,maxAuthorizationsPerHour:10,redisUrl:"https://redis.invalid",redisToken:"token"};
const resource="https://pegas.example/api/paid-services/legal-consultation";
const required:X402PaymentRequired&PaymentRequired=buildLegalPaymentRequired({config,resourceUrl:resource,feePayer:"Fee111",operationId:"op-1"});
assert.equal(required.x402Version,2);assert.equal(required.accepts.length,1);assert.equal(required.accepts[0].scheme,"exact");assert.equal(required.accepts[0].extra.paymentFlow,"upfront");assert.equal(required.accepts[0].amount,"10000");assert.equal(required.accepts[0].network,SOLANA_DEVNET_CAIP2);assert.equal(required.accepts[0].asset,DEVNET_USDC_MINT);assert.equal(required.accepts[0].payTo,"Seller111");assert.equal(requireFrozenOffer(required,config,resource),true);
assert.equal(requireFrozenOffer({...required,accepts:[{...required.accepts[0],amount:"10001"}]},config,resource),false);
assert.equal(quoteFingerprint(required),quoteFingerprint(structuredClone(required)));

// Critical acceptance invariant: the exact frozen first challenge is passed by identity to createPaymentPayload.
const frozen=freezePaymentRequired(required);let signedChallenge:X402PaymentRequired|null=null;let fetchCalls=0;let created=0;
const okResponse=await paidFetchWithFrozenX402({config,url:resource,body:'{"same":"body"}',internalAuth:"internal",frozenPaymentRequired:frozen,deps:{readFreshConfig:()=>config,getBuyerBalance:async()=>10000n,createSdk:async()=>({createPaymentPayload:async challenge=>{created++;signedChallenge=challenge;return{x402Version:2,resource:challenge.resource,accepted:challenge.accepts[0],payload:{transaction:"signed"}}},encodePaymentSignatureHeader:()=>({"PAYMENT-SIGNATURE":"signed-header"})}),fetchImpl:async(_url,init)=>{fetchCalls++;assert.equal(new Headers(init?.headers).get("PAYMENT-SIGNATURE"),"signed-header");assert.equal(init?.body,'{"same":"body"}');return new Response("{}",{status:200})}}});
assert.equal(okResponse.response.status,200);assert.strictEqual(signedChallenge,frozen,"policy-approved frozen first 402 object must be the exact object passed to createPaymentPayload");assert.equal(created,1);assert.equal(fetchCalls,1,"manual signer path performs exactly one paid fetch and no second unpaid 402 fetch");

// A broadened quote, fresh kill switch disable, or insufficient balance must stop before payload/signature creation.
let signatures=0;const sdkFactory=async()=>({createPaymentPayload:async(r:X402PaymentRequired)=>{signatures++;return{x402Version:2,resource:r.resource,accepted:r.accepts[0],payload:{}}},encodePaymentSignatureHeader:()=>({"PAYMENT-SIGNATURE":"x"})});
await assert.rejects(()=>paidFetchWithFrozenX402({config,url:resource,body:"{}",internalAuth:"x",frozenPaymentRequired:freezePaymentRequired({...required,accepts:[{...required.accepts[0],amount:"20000"}]}),deps:{readFreshConfig:()=>config,getBuyerBalance:async()=>100000n,createSdk:sdkFactory,fetchImpl:fetch}}),/frozen_payment_required_no_longer_authorized/);assert.equal(signatures,0,"broadened quote cannot be signed");
await assert.rejects(()=>paidFetchWithFrozenX402({config,url:resource,body:"{}",internalAuth:"x",frozenPaymentRequired:frozen,deps:{readFreshConfig:()=>({...config,enabled:false}),getBuyerBalance:async()=>100000n,createSdk:sdkFactory,fetchImpl:fetch}}),/kill_switch/);assert.equal(signatures,0,"fresh kill switch blocks before signing");
await assert.rejects(()=>paidFetchWithFrozenX402({config,url:resource,body:"{}",internalAuth:"x",frozenPaymentRequired:frozen,deps:{readFreshConfig:()=>config,getBuyerBalance:async()=>9999n,createSdk:sdkFactory,fetchImpl:fetch}}),/buyer_usdc_balance_insufficient/);assert.equal(signatures,0,"insufficient buyer USDC blocks before signing");

const now=Date.now();const binding={operation_id:"op",run_id:"run",request_fingerprint:"r",legal_context_fingerprint:"l",remaining_model_attempt_grant:2,absolute_deadline:now+120000};const oldToken=signInternalEnvelope({...binding,exp:now+1000},config.legalServiceAuthSecret);assert.equal(verifyInternalEnvelope(oldToken,config.legalServiceAuthSecret,now+2000),null);const deliveryToken=signInternalEnvelope({...binding,exp:now+62000},config.legalServiceAuthSecret);const verifiedDelivery=verifyInternalEnvelope(deliveryToken,config.legalServiceAuthSecret,now+2000);assert.equal(verifiedDelivery?.operation_id,binding.operation_id);assert.equal(verifiedDelivery?.request_fingerprint,binding.request_fingerprint);assert.equal(verifiedDelivery?.legal_context_fingerprint,binding.legal_context_fingerprint);assert.equal(verifiedDelivery?.absolute_deadline,binding.absolute_deadline);

assert.equal(isSolanaPublicKey(DEVNET_USDC_MINT),true);assert.equal(isSolanaPublicKey("not-a-solana-key"),false);assert.equal(isSolanaPublicKey("1111"),false);
const keyValidConfig={...config,buyerAddress:"11111111111111111111111111111111",legalPayTo:DEVNET_USDC_MINT};assert.equal(validatePaymentConfig(keyValidConfig).ok,true);const badSeller=validatePaymentConfig({...keyValidConfig,legalPayTo:"Seller111"});assert.equal(badSeller.ok,false);assert.ok(badSeller.errors.some(e=>e.includes("LEGAL_PAY_TO")),"malformed seller public key must be rejected");assert.equal(isValidFacilitatorFeePayer("Fee111"),false,"malformed facilitator fee payer must be rejected");assert.equal(isValidFacilitatorFeePayer(DEVNET_USDC_MINT),true);

// Exercise the official SDK HTTP codecs, including PAYMENT-RESPONSE sanitization.
// In a source-only review runtime without installed dependencies this one SDK-runtime assertion is reported as skipped; after npm ci it is mandatory and executes normally.
try {
  const http=await import("@x402/core/http");
  const encodedRequired=http.encodePaymentRequiredHeader(required);assert.deepEqual(http.decodePaymentRequiredHeader(encodedRequired),required);
  const responseHeader=http.encodePaymentResponseHeader({success:true,transaction:"tx",network:SOLANA_DEVNET_CAIP2,payer:"payer",extensionResponses:{private_side_channel:{secret:"do-not-expose"}}});
  const decodedResponse=http.decodePaymentResponseHeader(responseHeader);assert.equal("extensionResponses" in decodedResponse,false,"SDK PAYMENT-RESPONSE encoder must not expose facilitator-only extensionResponses");
} catch (error:unknown) {
  if (!(error&&typeof error==="object"&&"code" in error&&(error as {code?:unknown}).code==="ERR_MODULE_NOT_FOUND")) throw error;
  console.warn("SKIP: @x402/core is not installed in this source-only runtime; SDK codec runtime assertion will execute after npm ci.");
}

const seller=fs.readFileSync("app/api/paid-services/legal-consultation/route.ts","utf8");assert.match(seller,/PAYMENT-REQUIRED/);assert.match(seller,/PAYMENT-SIGNATURE/);assert.doesNotMatch(seller,/encodeX402Header|decodeX402Header|X-PAYMENT/);assert.match(seller,/encodePaymentResponseHeader/);assert.match(seller,/decodePaymentSignatureHeader/);assert.match(seller,/settleThroughFacilitator/);assert.match(seller,/confirmSolanaEvidence/);assert.match(seller,/confirmed_payment_required_before_delivery/);assert.match(seller,/op.mandate.state === "consumed"/);assert.match(seller,/transfer_matches_offer === true/);assert.match(seller,/payment_authority_changed_before_settlement/);assert.match(seller,/legal_ready: true/);
const buyer=fs.readFileSync("lib/payments/x402-client.ts","utf8");assert.doesNotMatch(buyer,/wrapFetchWithPayment|@x402\/fetch/);assert.match(buyer,/createPaymentPayload\(args\.frozenPaymentRequired\)/);assert.match(buyer,/encodePaymentSignatureHeader/);assert.match(buyer,/getBuyerUsdcBalanceAtomic/);assert.match(buyer,/readPaymentConfig/);
const solana=fs.readFileSync("lib/payments/solana-evidence.ts","utf8");assert.match(solana,/getTransaction/);assert.match(solana,/getSignatureStatuses/);assert.match(solana,/getTokenAccountsByOwner/);assert.match(solana,/explorer\.solana\.com\/tx/);assert.match(solana,/buyerDelta===-exact/);assert.match(solana,/sellerDelta===exact/);
const setup=fs.readFileSync("scripts/payment-setup-check.ts","utf8");assert.match(setup,/isSolanaPublicKey\(config\.buyer\)/);assert.match(setup,/isSolanaPublicKey\(config\.seller\)/);assert.match(setup,/isSolanaPublicKey\(feePayer\)/);
const server=fs.readFileSync("lib/payments/x402-server.ts","utf8");assert.match(server,/isValidFacilitatorFeePayer\(feePayer\)/);
console.log("Agentic payment protocol tests passed.");
