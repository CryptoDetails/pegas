import { BenchmarkDashboard } from "@/components/BenchmarkDashboard";
import { benchmarkCases } from "@/lib/benchmark";

export default function BenchmarkPage() {
  return <BenchmarkDashboard cases={benchmarkCases} />;
}
