import { createHmac, timingSafeEqual } from "node:crypto";

type InternalEnvelope={operation_id:string;run_id:string;request_fingerprint:string;legal_context_fingerprint:string;remaining_model_attempt_grant:number;absolute_deadline:number;exp:number};
function b64url(v:string){return Buffer.from(v).toString("base64url");}
export function signInternalEnvelope(payload:InternalEnvelope,secret:string){const body=b64url(JSON.stringify(payload));const sig=createHmac("sha256",secret).update(body).digest("base64url");return `${body}.${sig}`;}
export function verifyInternalEnvelope(token:string,secret:string,now=Date.now()):InternalEnvelope|null{const [body,sig,...rest]=token.split(".");if(!body||!sig||rest.length)return null;const expected=createHmac("sha256",secret).update(body).digest("base64url");const a=Buffer.from(sig);const b=Buffer.from(expected);if(a.length!==b.length||!timingSafeEqual(a,b))return null;try{const parsed=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as InternalEnvelope;if(parsed.exp<now||parsed.absolute_deadline<=now||parsed.remaining_model_attempt_grant<1||parsed.remaining_model_attempt_grant>2)return null;return parsed;}catch{return null;}}
