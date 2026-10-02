import { AppHeader } from "@/components/AppHeader";

const steps = [
  {
    title: "Rent a cloud GPU",
    why: "Choose enough VRAM for the model without paying for capacity you do not need.",
    do: "Create the GPU environment and record the actual deployment choices you can verify. Keep the public model endpoint in environment configuration, not source code.",
  },
  {
    title: "Run Ollama",
    why: "Ollama gives the open model a simple HTTP inference server.",
    do: "Install and start Ollama inside the GPU environment, then verify the service locally before connecting the web app.",
  },
  {
    title: "Pull and run Qwen3 4B",
    why: "A small open model is enough to prove the complete self-hosted inference path.",
    do: "Pull the exact qwen3:4b model tag and keep that model name configurable for deployment.",
  },
  {
    title: "Force and verify CUDA",
    why: "A GPU Pod does not help if the runtime silently selects the wrong backend.",
    do: "On the clean working Pod, OLLAMA_LLM_LIBRARY=cuda_v13 was required to select CUDA. Verify inference with ollama ps; the working proof showed 100% GPU.",
  },
  {
    title: "Prove the HTTP API",
    why: "A successful API request separates model/runtime problems from frontend problems.",
    do: "Send a structured-output request directly to Ollama and verify the returned data before adding another application layer.",
  },
  {
    title: "Connect Next.js server-side",
    why: "The browser should never receive the private model endpoint or infrastructure secrets.",
    do: "Route Browser → Next.js /api/analyze → RunPod Direct TCP → Ollama. MODEL_BASE_URL stays server-side and configurable.",
  },
  {
    title: "Measure actual results",
    why: "A reproducible portfolio case needs evidence, not a single successful screenshot.",
    do: "Run the frozen benchmark, record real per-request behavior, inspect failures, and separate measured facts from deployment configuration.",
  },
];

export default function BuildPage() {
  return (
    <div className="min-h-screen">
      <AppHeader active="build" />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="max-w-4xl">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Reproduce the experiment</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">Don&apos;t trust the demo. Reproduce it.</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Pegas is useful because the path can be repeated: rent compute, run an open model, prove the API, connect it server-side, and measure what actually happens.
          </p>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["VS Code", "RunPod", "GitHub", "Vercel"].map((tool) => (
            <div key={tool} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">You need</p>
              <p className="mt-2 font-semibold text-slate-950">{tool}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 space-y-4">
          {steps.map((step, index) => (
            <article key={step.title} className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[90px_1fr_1fr] md:p-7">
              <div className="text-3xl font-semibold tracking-tight text-blue-600">0{index + 1}</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">Step</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.why}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">What to do</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{step.do}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Current networking reality</p>
            <h2 className="mt-2 text-2xl font-semibold">Working demo first, hardened networking later.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">The current public RunPod path uses Direct TCP over HTTP. The external TCP port can change after a Pod restart, so MODEL_BASE_URL remains deployment configuration and is never hardcoded. This is not presented as a final TLS/auth setup.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">What is actually verified</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              <li>• Qwen3 4B inference through Ollama</li>
              <li>• CUDA-selected runtime on the clean Pod</li>
              <li>• ollama ps showed 100% GPU during verification</li>
              <li>• live structured inference through the public frontend</li>
              <li>• server-side schema validation and sanitized error states</li>
              <li>• no hosted third-party LLM API in the intended inference path</li>
            </ul>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Storage note</p>
          <p className="mt-2 text-sm leading-6 text-amber-950">Persistent/global storage was explored, but the clean working inference used normal local model storage on the running Pod. Treat persistent storage as an infrastructure experiment, not as proof of the current live model path.</p>
        </section>
      </main>
    </div>
  );
}
