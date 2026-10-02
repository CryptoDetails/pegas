import dataset from "@/data/benchmark.json";
import type { BenchmarkCase, Category } from "./types";

export const benchmarkCases = dataset as BenchmarkCase[];

export const categoryOrder: Category[] = [
  "integration",
  "support",
  "partnership",
  "marketing",
  "media",
  "billing",
  "other",
];

export function categoryCounts(cases: BenchmarkCase[]) {
  return categoryOrder.map((category) => ({
    category,
    count: cases.filter((item) => item.expectedCategory === category).length,
  }));
}
