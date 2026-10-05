import { createHash } from "node:crypto";
import type { AgentMandate, MandatePolicyDecision, PublicAgenticPaymentEvidence } from "./types";
import type { PaymentConfig } from "./config";

export type PaymentOperationState = "admitted"|"mandate_active"|"authorized"|"settled"|"confirmed"|"consultation_completed"|"consultation_failed"|"failed"|"outcome_unknown";
export type PaymentOperationRecord = {
  operation_id:string; run_id:string; scenario:"paid_legal"; client_request_hash:string; session_scope_hash:string; input_commitment:string;
  state:PaymentOperationState; authorization_count:number; consultation_fingerprint:string|null; quote_fingerprint:string|null;
  mandate:AgentMandate|null; policy:MandatePolicyDecision|null; evidence:PublicAgenticPaymentEvidence|null; seller_result:unknown|null; workflow_result:unknown|null;
  settlement_signature:string|null; created_at:string; updated_at:string;
};

type RedisReply = { result?: unknown; error?: string };
export function sha256(value:string){ return createHash("sha256").update(value).digest("hex"); }
export function inputCommitment(message:string,scenario:string){ return sha256(`${scenario}\n${message.trim()}`); }
function keyOp(id:string){return `pegas:pay:op:${id}`;} function keyReq(session:string,id:string){return `pegas:pay:req:${sha256(session)}:${sha256(id)}`;}

export class PaymentLedger {
  private readonly config: PaymentConfig;
  constructor(config: PaymentConfig) { this.config = config; }
  private async command(args:(string|number)[]) {
    if (!this.config.redisUrl || !this.config.redisToken) throw new Error("payment_ledger_unavailable");
    const response=await fetch(this.config.redisUrl,{method:"POST",headers:{Authorization:`Bearer ${this.config.redisToken}`,"Content-Type":"application/json"},body:JSON.stringify(args),cache:"no-store"});
    if(!response.ok) throw new Error(`payment_ledger_http_${response.status}`);
    const data=await response.json() as RedisReply; if(data.error) throw new Error(`payment_ledger_error:${data.error}`); return data.result;
  }
  async ping(){ return (await this.command(["PING"])) === "PONG"; }
  async admit(args:{sessionScope:string;clientRequestId:string;message:string;runId:string;operationId:string}) {
    const reqKey=keyReq(args.sessionScope,args.clientRequestId); const opKey=keyOp(args.operationId); const commitment=inputCommitment(args.message,"paid_legal");
    const now=new Date().toISOString(); const record:PaymentOperationRecord={operation_id:args.operationId,run_id:args.runId,scenario:"paid_legal",client_request_hash:sha256(args.clientRequestId),session_scope_hash:sha256(args.sessionScope),input_commitment:commitment,state:"admitted",authorization_count:0,consultation_fingerprint:null,quote_fingerprint:null,mandate:null,policy:null,evidence:null,seller_result:null,workflow_result:null,settlement_signature:null,created_at:now,updated_at:now};
    const lua=`local existing=redis.call('GET',KEYS[1]); if existing then return existing end; redis.call('SET',KEYS[1],ARGV[1],'EX',86400); redis.call('SET',KEYS[2],ARGV[2],'EX',86400); return ARGV[1]`;
    const mapping=JSON.stringify({operation_id:args.operationId,run_id:args.runId,input_commitment:commitment});
    const raw=await this.command(["EVAL",lua,"2",reqKey,opKey,mapping,JSON.stringify(record)]); if(typeof raw!=="string") throw new Error("payment_ledger_invalid_admission");
    const resolved=JSON.parse(raw) as {operation_id:string;run_id:string;input_commitment:string};
    if(resolved.input_commitment!==commitment) return {kind:"conflict" as const};
    if(resolved.operation_id!==args.operationId){ const existing=await this.get(resolved.operation_id); return {kind:"existing" as const, record:existing}; }
    return {kind:"created" as const,record};
  }
  async get(operationId:string):Promise<PaymentOperationRecord|null>{ const raw=await this.command(["GET",keyOp(operationId)]); return typeof raw==="string"?JSON.parse(raw) as PaymentOperationRecord:null; }
  async put(record:PaymentOperationRecord){ record.updated_at=new Date().toISOString(); await this.command(["SET",keyOp(record.operation_id),JSON.stringify(record),"EX",86400]); return record; }
  async attachMandate(operationId:string,mandate:AgentMandate){ const r=await this.require(operationId); if(r.mandate) return r; r.mandate=mandate;r.state="mandate_active";return this.put(r); }
  async savePolicy(operationId:string,decision:MandatePolicyDecision,evidence:PublicAgenticPaymentEvidence){ const r=await this.require(operationId);r.policy=decision;r.evidence=evidence;return this.put(r); }
  async reserveAuthorization(args:{operationId:string;sessionScope:string;amount:string;day:string}){
    await this.require(args.operationId); const opKey=keyOp(args.operationId); const scope=sha256(args.sessionScope); const sessionKey=`pegas:pay:budget:session:${scope}`; const dayKey=`pegas:pay:budget:day:${args.day}`; const rateKey=`pegas:pay:rate:${scope}`; const amount=BigInt(args.amount); const lua=`local op=redis.call('GET',KEYS[1]); if not op then return 'missing' end; local v=cjson.decode(op); if v.authorization_count~=0 or not v.mandate or v.mandate.state~='active' then return 'used' end; local s=tonumber(redis.call('GET',KEYS[2]) or '0'); local d=tonumber(redis.call('GET',KEYS[3]) or '0'); local r=tonumber(redis.call('GET',KEYS[4]) or '0'); local a=tonumber(ARGV[1]); if r>=3 then return 'rate_limit' end; if s+a>tonumber(ARGV[2]) then return 'session_budget' end; if d+a>tonumber(ARGV[3]) then return 'daily_budget' end; v.authorization_count=1;v.state='authorized';v.updated_at=ARGV[4];redis.call('SET',KEYS[1],cjson.encode(v),'EX',86400);redis.call('INCRBY',KEYS[2],a);redis.call('EXPIRE',KEYS[2],86400);redis.call('INCRBY',KEYS[3],a);redis.call('EXPIRE',KEYS[3],172800);redis.call('INCR',KEYS[4]);redis.call('EXPIRE',KEYS[4],3600);return 'ok'`;
    const result=await this.command(["EVAL",lua,"4",opKey,sessionKey,dayKey,rateKey,amount.toString(),this.config.maxPerSessionAtomic.toString(),this.config.maxDailyAtomic.toString(),new Date().toISOString()]); return result;
  }
  async markSettlement(operationId:string,signature:string){ const r=await this.require(operationId);r.settlement_signature=signature;r.state="settled";return this.put(r); }
  async consumeMandate(operationId:string,evidence:PublicAgenticPaymentEvidence){ const opKey=keyOp(operationId); const lua=`local op=redis.call('GET',KEYS[1]); if not op then return 'missing' end; local v=cjson.decode(op); if not v.mandate or v.mandate.state~='active' then return 'not_active' end; v.mandate.state='consumed';v.state='confirmed';v.evidence=cjson.decode(ARGV[1]);v.evidence.authority.state='consumed';v.updated_at=ARGV[2];redis.call('SET',KEYS[1],cjson.encode(v),'EX',86400);return cjson.encode(v)`; const raw=await this.command(["EVAL",lua,"1",opKey,JSON.stringify(evidence),new Date().toISOString()]); if(raw==="missing"||raw==="not_active") throw new Error(`mandate_consume_${raw}`); return JSON.parse(String(raw)) as PaymentOperationRecord; }
  async reconcileConfirmedEvidence(operationId:string,evidence:PublicAgenticPaymentEvidence){
    const opKey=keyOp(operationId);
    const lua=`local op=redis.call('GET',KEYS[1]); if not op then return 'missing' end; local v=cjson.decode(op); if not v.mandate or v.authorization_count~=1 or not v.settlement_signature then return 'not_authorized' end; if v.mandate.state=='active' then v.mandate.state='consumed' elseif v.mandate.state~='consumed' then return 'not_confirmable' end; v.state='confirmed';v.evidence=cjson.decode(ARGV[1]);v.evidence.authority.state='consumed';v.updated_at=ARGV[2];redis.call('SET',KEYS[1],cjson.encode(v),'EX',86400);return cjson.encode(v)`;
    const raw=await this.command(["EVAL",lua,"1",opKey,JSON.stringify(evidence),new Date().toISOString()]);
    if(raw==="missing"||raw==="not_authorized"||raw==="not_confirmable")throw new Error(`payment_reconcile_${raw}`);
    return JSON.parse(String(raw)) as PaymentOperationRecord;
  }
  async saveSellerResult(operationId:string,state:PaymentOperationState,sellerResult:unknown,evidence?:PublicAgenticPaymentEvidence){ const r=await this.require(operationId);r.state=state;r.seller_result=sellerResult;if(evidence)r.evidence=evidence;return this.put(r); }
  async saveWorkflowResult(operationId:string,workflowResult:unknown){ const r=await this.require(operationId);r.workflow_result=workflowResult;return this.put(r); }
  async allowReceiptRecheck(sessionScope:string){ const key=`pegas:pay:receipt-rate:${sha256(sessionScope)}`; const lua=`local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; if n>20 then return 0 end; return 1`; return (await this.command(["EVAL",lua,"1",key]))===1; }
  private async require(id:string){const r=await this.get(id);if(!r)throw new Error("payment_operation_missing");return r;}
}
