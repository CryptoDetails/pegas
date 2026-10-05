import { readPaymentConfig, type PaymentConfig } from "./config.ts";
import type { X402PaymentRequired, X402PaymentRequirement } from "./types";
import { getBuyerUsdcBalanceAtomic } from "./solana-evidence.ts";
export { decodeBase58, isSolanaPublicKey } from "./solana-utils.ts";

function stable(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(stable).join(",")}]`;
  if(value&&typeof value==="object")return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
function sameRequirement(a:unknown,b:unknown){return stable(a)===stable(b)}
function sameResource(a:unknown,b:unknown){return stable(a)===stable(b)}

function assertFreshAuthority(snapshot:PaymentConfig,fresh:PaymentConfig,required:X402PaymentRequired,url:string){
  if(!fresh.enabled)throw new Error("payment_kill_switch_active_before_signing");
  const critical:[string,unknown,unknown][]=[
    ["network",fresh.network,snapshot.network],["assetMint",fresh.assetMint,snapshot.assetMint],["buyerAddress",fresh.buyerAddress,snapshot.buyerAddress],
    ["legalPayTo",fresh.legalPayTo,snapshot.legalPayTo],["amountAtomic",fresh.amountAtomic,snapshot.amountAtomic],["maxPerOperationAtomic",fresh.maxPerOperationAtomic,snapshot.maxPerOperationAtomic],
  ];
  if(critical.some(([,a,b])=>a!==b))throw new Error("payment_authority_changed_before_signing");
  const q=required.accepts[0];
  if(required.x402Version!==2||required.accepts.length!==1||required.resource.url!==url||q?.scheme!=="exact"||q.network!==fresh.network||q.asset!==fresh.assetMint||q.amount!==fresh.amountAtomic||q.payTo!==fresh.legalPayTo||q.extra?.paymentFlow!=="upfront")throw new Error("frozen_payment_required_no_longer_authorized");
}

async function createSdk(config:PaymentConfig){
  const { createX402SvmSdk } = await import("./x402-sdk-adapter.ts");
  return createX402SvmSdk(config);
}

function normalizePaymentSignatureHeader(encoded:unknown){
  if(typeof encoded==="string")return encoded;
  const headers=new Headers(encoded as HeadersInit);const value=headers.get("PAYMENT-SIGNATURE");
  if(!value)throw new Error("x402_sdk_did_not_encode_PAYMENT_SIGNATURE");return value;
}

type X402CreatedPaymentPayload={accepted?:unknown;resource?:unknown};

export type FrozenPaymentDeps={
  readFreshConfig?:()=>PaymentConfig;
  getBuyerBalance?: (config:PaymentConfig)=>Promise<bigint>;
  createSdk?: (config:PaymentConfig)=>Promise<{createPaymentPayload:(required:X402PaymentRequired)=>Promise<X402CreatedPaymentPayload>;encodePaymentSignatureHeader:(payload:unknown)=>unknown}>;
  fetchImpl?: typeof fetch;
};

export async function paidFetchWithFrozenX402(args:{config:PaymentConfig;url:string;body:string;internalAuth:string;frozenPaymentRequired:X402PaymentRequired;onAuthorizationCreated?:()=>void;onSettling?:()=>void;deps?:FrozenPaymentDeps}){
  // TOCTOU invariant: no unpaid fetch exists in this function. The only PaymentRequired accepted here is the exact frozen object already policy-approved by the caller.
  const fresh=(args.deps?.readFreshConfig??readPaymentConfig)();
  assertFreshAuthority(args.config,fresh,args.frozenPaymentRequired,args.url);
  const balance=await (args.deps?.getBuyerBalance??getBuyerUsdcBalanceAtomic)(fresh);
  if(balance<BigInt(fresh.amountAtomic))throw new Error(`buyer_usdc_balance_insufficient:${balance.toString()}`);
  const sdk=await (args.deps?.createSdk??createSdk)(fresh);
  const paymentPayload=await sdk.createPaymentPayload(args.frozenPaymentRequired);
  if(!sameRequirement(paymentPayload?.accepted,args.frozenPaymentRequired.accepts[0])||!sameResource(paymentPayload?.resource,args.frozenPaymentRequired.resource))throw new Error("signed_payload_does_not_match_frozen_payment_required");
  const signatureHeader=normalizePaymentSignatureHeader(sdk.encodePaymentSignatureHeader(paymentPayload));
  args.onAuthorizationCreated?.();args.onSettling?.();
  const response=await (args.deps?.fetchImpl??fetch)(args.url,{method:"POST",headers:{"Content-Type":"application/json","X-Pegas-Internal-Auth":args.internalAuth,"Cache-Control":"no-store","PAYMENT-SIGNATURE":signatureHeader},body:args.body,redirect:"error",cache:"no-store"});
  return {response,sawSignature:true};
}

export function requirementEquals(a:X402PaymentRequirement,b:X402PaymentRequirement){return sameRequirement(a,b)}
