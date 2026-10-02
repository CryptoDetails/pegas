import Link from "next/link";

const steps = [
  "Rent a cloud GPU",
  "Run Ollama",
  "Pull an open model",
  "Force / verify CUDA",
  "Prove the HTTP API",
  "Connect Next.js server-side",
  "Measure actual results",
];

export function BuildGuideTeaser() {
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-slate-950 p-6 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Build it yourself</p>
          <h2 className="mt-3 max-w-md text-2xl font-semibold tracking-tight sm:text-3xl">Don&apos;t trust the demo. Reproduce it.</h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">
            The useful proof is the path another person can repeat: GPU, Ollama, open model, CUDA verification, server-side integration, and real measurements.
          </p>
          <Link href="/build" className="focus-ring mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold !text-slate-950 transition hover:bg-slate-100">
            View the build path →
          </Link>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
          {steps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-xs font-bold text-blue-600">0{index + 1}</span>
              <p className="mt-2 text-sm font-semibold text-slate-900">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
