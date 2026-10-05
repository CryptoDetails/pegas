import type { ChainEvidence, X402PaymentRequirement } from "./types";
import type { PaymentConfig } from "./config";
import { decodeBase58 } from "./solana-utils.ts";

type TokenAccountEntry={
  account?:{
    data?:{
      parsed?:{
        info?:{
          tokenAmount?:{amount?:string|number|bigint|boolean};
        };
      };
    };
  };
};
type TokenAccountResult={value?:TokenAccountEntry[]};
type TokenBalance={mint?:string;accountIndex?:number;owner?:string;uiTokenAmount?:{amount?:string}};
type ParsedTransaction={meta?:{err?:unknown;preTokenBalances?:TokenBalance[];postTokenBalances?:TokenBalance[]}};
type SignatureStatusesResult={value?:Array<{confirmationStatus?:unknown}|null>};

const DEVNET_GENESIS="EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
async function rpc(config:PaymentConfig,method:string,params:unknown[],signal?:AbortSignal){const res=await fetch(config.rpcUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal,cache:"no-store"});if(!res.ok)throw new Error(`solana_rpc_http_${res.status}`);const data=await res.json() as {result?:unknown;error?:{message?:string}};if(data.error)throw new Error(`solana_rpc_${data.error.message??"error"}`);return data.result;}
export async function verifyDevnetCluster(config:PaymentConfig,signal?:AbortSignal){const genesis=await rpc(config,"getGenesisHash",[],signal);return genesis===DEVNET_GENESIS;}
export async function getBuyerUsdcBalanceAtomic(config:PaymentConfig,signal?:AbortSignal){
 const result=await rpc(config,"getTokenAccountsByOwner",[config.buyerAddress,{mint:config.assetMint},{encoding:"jsonParsed",commitment:"confirmed"}],signal) as TokenAccountResult;
 const values=Array.isArray(result?.value)?result.value:[];
 return values.reduce((sum:bigint,v)=>sum+BigInt(v?.account?.data?.parsed?.info?.tokenAmount?.amount??"0"),0n);
}
function amount(balance:TokenBalance|undefined){const raw=balance?.uiTokenAmount?.amount;return typeof raw==="string"?BigInt(raw):0n;}
function matchingDeltas(tx:ParsedTransaction,mint:string,buyer:string,seller:string){const pre=Array.isArray(tx?.meta?.preTokenBalances)?tx.meta.preTokenBalances:[];const post=Array.isArray(tx?.meta?.postTokenBalances)?tx.meta.postTokenBalances:[];const map=new Map<number,{owner:string;pre:bigint;post:bigint}>();for(const b of pre){if(b?.mint!==mint||typeof b?.accountIndex!=="number")continue;map.set(b.accountIndex,{owner:typeof b.owner==="string"?b.owner:"",pre:amount(b),post:0n});}for(const b of post){if(b?.mint!==mint||typeof b?.accountIndex!=="number")continue;const existing=map.get(b.accountIndex)??{owner:typeof b.owner==="string"?b.owner:"",pre:0n,post:0n};existing.owner=typeof b.owner==="string"?b.owner:existing.owner;existing.post=amount(b);map.set(b.accountIndex,existing);}const buyerEntries=[...map.values()].filter(v=>v.owner===buyer&&v.post-v.pre<0n);const sellerEntries=[...map.values()].filter(v=>v.owner===seller&&v.post-v.pre>0n);const buyerDelta=buyerEntries.reduce((s,v)=>s+(v.post-v.pre),0n);const sellerDelta=sellerEntries.reduce((s,v)=>s+(v.post-v.pre),0n);return {buyerEntries,sellerEntries,buyerDelta,sellerDelta};}
export function explorerUrl(signature:string){return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;}
export async function confirmSolanaEvidence(args:{config:PaymentConfig;signature:string;quote:X402PaymentRequirement;remainingMs:number}) : Promise<ChainEvidence>{
 const base:ChainEvidence={status:"pending",transaction_signature:args.signature,explorer_url:explorerUrl(args.signature),token_payer:null,recipient_owner:null,amount_atomic:null,asset_mint:null,transfer_matches_offer:null,checked_at:null};
 try{if(decodeBase58(args.signature).length!==64)return {...base,status:"failed",transfer_matches_offer:false,checked_at:new Date().toISOString()};const cluster=await verifyDevnetCluster(args.config);if(!cluster)return {...base,status:"failed",transfer_matches_offer:false,checked_at:new Date().toISOString()};}catch{return {...base,status:"unavailable",checked_at:new Date().toISOString()};}
 const end=Date.now()+Math.max(1,Math.min(15_000,args.remainingMs));
 while(Date.now()<end){try{const tx=await rpc(args.config,"getTransaction",[args.signature,{encoding:"jsonParsed",commitment:"confirmed",maxSupportedTransactionVersion:0}]);if(!tx){await new Promise(r=>setTimeout(r,750));continue;}const data=tx as ParsedTransaction;if(data?.meta?.err!=null)return {...base,status:"failed",transfer_matches_offer:false,checked_at:new Date().toISOString()};const deltas=matchingDeltas(data,args.quote.asset,args.config.buyerAddress,args.config.legalPayTo);const exact=BigInt(args.quote.amount);const matches=deltas.buyerEntries.length===1&&deltas.sellerEntries.length===1&&deltas.buyerDelta===-exact&&deltas.sellerDelta===exact&&args.quote.amount==="10000"&&args.quote.payTo===args.config.legalPayTo&&args.quote.asset===args.config.assetMint;let status:"confirmed"|"finalized"="confirmed";try{const st=await rpc(args.config,"getSignatureStatuses",[[args.signature],{searchTransactionHistory:true}]) as SignatureStatusesResult;const confirmation=st?.value?.[0]?.confirmationStatus;if(confirmation==="finalized")status="finalized";}catch{/* confirmed tx proof is enough */}return {...base,status:matches?status:"failed",token_payer:args.config.buyerAddress,recipient_owner:args.config.legalPayTo,amount_atomic:args.quote.amount,asset_mint:args.quote.asset,transfer_matches_offer:matches,checked_at:new Date().toISOString()};}catch{await new Promise(r=>setTimeout(r,750));}}
 return {...base,status:"pending",checked_at:new Date().toISOString()};
}
