const steps = ["Browser", "Pegas API", "Cloud GPU", "Ollama", "Qwen3 4B"];

type InferencePathProps = {
  activeStep: number;
  preview?: boolean;
};

export function InferencePath({ activeStep, preview = false }: InferencePathProps) {
  return (
    <section className="card-shadow rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white sm:p-7" aria-live="polite">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Inference path</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Watch the request move through your stack</h2>
        </div>
        <span className="w-fit rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
          {preview ? "Visual preview" : "Live request"}
        </span>
      </div>

      <div className="mt-6 grid gap-2 md:grid-cols-5">
        {steps.map((step, index) => {
          const active = index <= activeStep;
          return (
            <div key={step} className="relative">
              <div className={`rounded-2xl border px-3 py-4 text-center transition-all duration-300 ${active ? "border-blue-400 bg-blue-500/15 text-white" : "border-slate-800 bg-slate-900/70 text-slate-500"}`}>
                <div className={`mx-auto mb-2 h-2.5 w-2.5 rounded-full ${active ? "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.8)]" : "bg-slate-700"}`} />
                <span className="text-xs font-semibold">{step}</span>
              </div>
              {index < steps.length - 1 ? <span className="absolute right-[-0.45rem] top-1/2 hidden -translate-y-1/2 text-slate-600 md:block">→</span> : null}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">
        {preview
          ? "This frontend build visualizes the final request path. The live GPU call is connected only after the infrastructure proof run succeeds."
          : "The request is processed by the open model running on your rented GPU instance."}
      </p>
    </section>
  );
}
