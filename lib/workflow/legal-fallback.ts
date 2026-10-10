import type { LegalAdvisory } from "./types.ts";
import type { LegalModelContext } from "../payments/types.ts";

type PolicyId = LegalAdvisory["findings"][number]["policy_id"];
type Finding = LegalAdvisory["findings"][number];

// Deterministic first-pass findings for the small Legal model. No extra model call.
const FALLBACK_RULES: Array<{ policy_id: PolicyId; matches: (text: string) => boolean; observation: string; recommended_action: string }> = [
  {
    policy_id: "DL-01",
    matches: (t) => /\b(train|training|model|machine learning|ai)\b/i.test(t) && /\b(confidential|shared|our)\b.*\b(information|data)\b/i.test(t),
    observation: "The clause allows the vendor to use shared or confidential information for AI model training without explicit written authorization.",
    recommended_action: "Require explicit written opt-in before any AI training use, or remove the training right.",
  },
  {
    policy_id: "DL-02",
    matches: (t) => /\b(keep|kept|retain|retention|years?|delete|deletion|return)\b/i.test(t),
    observation: "The clause does not set a clear duty to return or delete shared information after the agreement ends.",
    recommended_action: "Add a duty to delete or return all shared information within 30 days after termination, with written confirmation.",
  },
  {
    policy_id: "DL-03",
    matches: (t) => /\b(sign|signing|signature|accept|approve)\b/i.test(t),
    observation: "Signing this contract requires human legal approval under the demo policy.",
    recommended_action: "Get human legal approval before signing; this demo assessment is not an approval.",
  },
];

export function ensureUsefulAdvisory(advisory: LegalAdvisory, context: Pick<LegalModelContext, "safe_brief" | "question" | "relevant_evidence">): LegalAdvisory {
  const text = `${context.safe_brief} ${context.question} ${context.relevant_evidence.join(" ")}`.toLowerCase();
  const present = new Set(advisory.findings.map((f) => f.policy_id));
  const added: Finding[] = FALLBACK_RULES
    .filter((rule) => !present.has(rule.policy_id) && rule.matches(text))
    .map(({ policy_id, observation, recommended_action }) => ({ policy_id, observation, recommended_action }));
  const findings = [...advisory.findings, ...added].slice(0, 3);
  if (!findings.length) return advisory;
  const verdictChanged = advisory.verdict === "needs_information" || advisory.verdict === "no_policy_issue_identified";
  const verdict: LegalAdvisory["verdict"] = verdictChanged ? "human_review_required" : advisory.verdict;
  const summary = verdictChanged || advisory.summary.trim().length < 40
    ? `First-pass review: ${findings.length} policy issue(s) found. ${findings[0].observation}`
    : advisory.summary;
  return { ...advisory, verdict, summary, findings };
}
