import { readPaymentConfig, validatePaymentConfig } from "@/lib/payments/config";
import { PaymentLedger, sha256 } from "@/lib/payments/store";
import { confirmSolanaEvidence } from "@/lib/payments/solana-evidence";
import { buildPublicEvidence } from "@/lib/payments/evidence";
import type { X402PaymentRequirement } from "@/lib/payments/types";

export const runtime="nodejs";export const dynamic="force-dynamic";
function cookie(request:Request,name:string){const raw=request.headers.get("cookie")??"";for(const item of raw.split(";")){const [k,...rest]=item.trim().split("=");if(k===name)return decodeURIComponent(rest.join("="));}return null;}
export async function POST(request:Request){
 const checked=validatePaymentConfig(readPaymentConfig(),{requireEnabled:false});if(!checked.ok)return Response.json({error:"receipt_recheck_unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
 let body:{operation_id?:unknown};try{body=await request.json() as {operation_id?:unknown};}catch{return Response.json({error:"invalid_json"},{status:400});}
 if(!body||typeof body.operation_id!=="string"||Object.keys(body).some(k=>k!=="operation_id"))return Response.json({error:"operation_id_only"},{status:400});
 const session=cookie(request,"pegas_session");if(!session)return Response.json({error:"not_owned"},{status:403});
 const ledger=new PaymentLedger(checked.config);const allowed=await ledger.allowReceiptRecheck(session).catch(()=>false);if(!allowed)return Response.json({error:"rate_limited"},{status:429,headers:{"Cache-Control":"no-store"}});
 let op=await ledger.get(body.operation_id).catch(()=>null);if(!op||op.session_scope_hash!==sha256(session))return Response.json({error:"not_found"},{status:404,headers:{"Cache-Control":"no-store"}});
 if(!op.evidence||!op.mandate||!op.policy)return Response.json({operation_id:op.operation_id,evidence:null,state:op.state},{headers:{"Cache-Control":"no-store"}});
 let evidence=op.evidence;
 if(op.settlement_signature&&(evidence.settlement.confirmation_status==="pending"||evidence.settlement.confirmation_status==="unavailable")){
   const quote:X402PaymentRequirement={scheme:"exact",network:checked.config.network,amount:"10000",asset:checked.config.assetMint,payTo:checked.config.legalPayTo,maxTimeoutSeconds:60,extra:{paymentFlow:"upfront",feePayer:evidence.settlement.facilitator_fee_payer??undefined}};
   const chain=await confirmSolanaEvidence({config:checked.config,signature:op.settlement_signature,quote,remainingMs:10_000});
   evidence=buildPublicEvidence({config:checked.config,operationId:op.operation_id,mandate:op.mandate,policy:op.policy,feePayer:evidence.settlement.facilitator_fee_payer,chain,deliveryStatus:evidence.consultation.delivery_status});
   const confirmed=(chain.status==="confirmed"||chain.status==="finalized")&&chain.transfer_matches_offer===true&&chain.token_payer===checked.config.buyerAddress&&chain.recipient_owner===checked.config.legalPayTo&&chain.asset_mint===checked.config.assetMint&&chain.amount_atomic==="10000";
   if(confirmed){
     evidence={...evidence,authority:{...evidence.authority,state:"consumed"}};
     op=await ledger.reconcileConfirmedEvidence(op.operation_id,evidence);
     evidence=op.evidence??evidence;
   }else{
     await ledger.saveSellerResult(op.operation_id,chain.status==="failed"?"failed":op.state,op.seller_result,evidence).catch(()=>undefined);
   }
 }
 return Response.json({operation_id:op.operation_id,state:op.state,evidence},{headers:{"Cache-Control":"no-store"}});
}
