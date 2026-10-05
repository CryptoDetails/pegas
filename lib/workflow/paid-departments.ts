import { DEPARTMENT_PROFILES } from "./departments";
export const LEGAL_PROFILE={id:"legal" as const,label:"Legal",owns:["contract policy review","vendor terms","NDA and data-use terms","legal-policy escalation before signature"],does_not_own:["technical troubleshooting","billing operations","commercial campaign execution"],example_requests:["Review vendor NDA AI training clause","Assess missing deletion/return term before signature"]};
export const PAID_DEPARTMENT_PROFILES=[...DEPARTMENT_PROFILES,LEGAL_PROFILE] as const;
