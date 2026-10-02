import { siteConfig } from "@/lib/site";

const proof = [
  {
    label: "Open model",
    value: siteConfig.modelName,
    note: "configured model",
  },
  {
    label: "Cloud compute",
    value: siteConfig.computeName,
    note: "RunPod infrastructure",
  },
  {
    label: "Hosted LLM API",
    value: siteConfig.hostedLlmApi,
    note: "not in the inference path",
  },
];

export function ProofStrip() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {proof.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{item.label}</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{item.value}</p>
          <p className="mt-1 text-xs text-slate-500">{item.note}</p>
        </div>
      ))}
    </div>
  );
}
