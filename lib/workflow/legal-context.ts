import { createHash } from "node:crypto";
import { LEGAL_POLICY } from "./legal-policy.ts";
import type { Confidentiality } from "./types.ts";
import type { LegalModelContext } from "../payments/types.ts";

export function fingerprintObject(value:unknown){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
export function buildLegalModelContext(args:{safeBrief:string;question:string;relevantEvidence:string[];confidentiality:Confidentiality;recipientRestrictions:string[]}):LegalModelContext{return{safe_brief:args.safeBrief.slice(0,600),question:args.question.slice(0,500),relevant_evidence:args.relevantEvidence.slice(0,3),confidentiality:args.confidentiality,recipient_restrictions:args.recipientRestrictions.slice(0,4),demo_policy:{version:LEGAL_POLICY.version,rules:LEGAL_POLICY.rules.map(r=>({...r}))}};}
