import type { Department } from "./types";

export type DepartmentProfile = {
  id: Department;
  label: string;
  owns: string[];
  does_not_own: string[];
  example_requests: string[];
};

export const DEPARTMENT_PROFILES: readonly DepartmentProfile[] = [
  {
    id: "technical",
    label: "Technical",
    owns: ["API integration", "SDK, webhook, or endpoint issues", "HTTP errors", "troubleshooting", "technical partner launch and support"],
    does_not_own: ["commercial campaign planning", "invoices and billing"],
    example_requests: ["Partner API returns 401", "Webhook delivery fails", "SDK integration needs troubleshooting"],
  },
  {
    id: "business",
    label: "Business",
    owns: ["partnerships", "sales and commercial communication", "marketing and co-marketing", "partner launch coordination", "media and commercial relationship requests"],
    does_not_own: ["API troubleshooting", "invoice disputes"],
    example_requests: ["Co-marketing campaign", "Partnership discussion", "Commercial launch coordination"],
  },
  {
    id: "finance",
    label: "Finance",
    owns: ["invoices", "duplicate charges", "billing", "payment and refund review requests"],
    does_not_own: ["technical integration troubleshooting", "partnership marketing coordination"],
    example_requests: ["Duplicate invoice charge", "Billing question", "Payment review request"],
  },
] as const;

export function isDepartment(value: unknown): value is Department {
  return value === "technical" || value === "business" || value === "finance";
}
