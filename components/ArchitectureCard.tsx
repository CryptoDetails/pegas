const steps = ["Your browser", "Next.js server route", "RunPod GPU", "Ollama", "Qwen3 4B"];

export function ArchitectureCard() {
  return (
    <aside className="card-shadow soft-grid overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-7">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Where does your prompt go?</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">The whole inference path, in one glance</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The browser sends the request to your server-side route. Model inference happens on the GPU instance you deploy.
        </p>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={step}>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${index === steps.length - 1 ? "bg-blue-600 text-white" : "bg-slate-950 text-white"}`}>
                {index + 1}
              </span>
              <span className="text-sm font-semibold text-slate-800">{step}</span>
            </div>
            {index < steps.length - 1 ? <div className="ml-[1.65rem] h-2 w-px bg-slate-300" /> : null}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.13em] text-green-700">Hosted LLM provider</p>
        <p className="mt-1 text-lg font-semibold text-green-900">Not in the request path</p>
        <p className="mt-2 text-xs leading-5 text-green-800">
          Vercel and RunPod still host infrastructure. The difference is that model inference is not delegated to a hosted LLM API.
        </p>
      </div>
    </aside>
  );
}
