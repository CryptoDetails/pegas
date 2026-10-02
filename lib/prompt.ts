export const TRIAGE_SYSTEM_PROMPT = [
  "Classify the message by the primary action required now.",
  "Use only information present in the message; do not invent hidden intent or missing facts.",
  "Return exactly one allowed category and one allowed priority.",
  "Write the summary as one concise sentence.",
  "Write nextAction as one concrete operational action.",
  "Return only the structured result required by the provided schema.",
].join(" ");
