import type { Category, Priority } from "./types";

const categories = [
  "integration",
  "support",
  "partnership",
  "marketing",
  "media",
  "billing",
  "other",
] as const satisfies readonly Category[];

const priorities = ["high", "medium", "low"] as const satisfies readonly Priority[];

export const triageSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string", enum: categories },
    priority: { type: "string", enum: priorities },
    summary: { type: "string" },
    nextAction: { type: "string" },
  },
  required: ["category", "priority", "summary", "nextAction"],
} as const;

export type ValidatedTriage = {
  category: Category;
  priority: Priority;
  summary: string;
  nextAction: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateTriageOutput(value: unknown): ValidatedTriage | null {
  if (!isRecord(value)) return null;

  const keys = Object.keys(value);
  const expectedKeys = ["category", "priority", "summary", "nextAction"];
  if (keys.length !== expectedKeys.length || keys.some((key) => !expectedKeys.includes(key))) {
    return null;
  }

  const { category, priority, summary, nextAction } = value;

  if (typeof category !== "string" || !categories.includes(category as Category)) return null;
  if (typeof priority !== "string" || !priorities.includes(priority as Priority)) return null;
  if (typeof summary !== "string" || !summary.trim()) return null;
  if (typeof nextAction !== "string" || !nextAction.trim()) return null;

  return {
    category: category as Category,
    priority: priority as Priority,
    summary: summary.trim(),
    nextAction: nextAction.trim(),
  };
}
