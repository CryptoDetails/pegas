import { AppHeader } from "@/components/AppHeader";

const steps = [
  {
    title: "Rent a GPU",
    why: "Choose enough VRAM for the model without paying for capacity you do not need.",
    do: "Create a RunPod Pod, record the actual GPU, region, hourly rate, and storage choice before deployment.",
  },
  {
    title: "Run Ollama",
    why: "Ollama gives the model a simple local HTTP inference server.",
    do: "Install Ollama inside the GPU environment and verify the service before exposing anything externally.",
  },
  {
    title: "Pull Qwen3 4B",
    why: "A small open model is enough to prove the full pipeline without expensive hardware.",
    do: "Download the exact model tag you will benchmark and record that tag for reproducibility.",
  },
  {
    title: "Prove the API",
    why: "A successful HTTP request isolates infrastructure from frontend problems.",
    do: "Send one structured-output request, capture the response, latency, schema validity, and a screenshot of the proof run.",
  },
  {
    title: "Connect the web app",
    why: "The browser should never need the private model endpoint or credentials.",
    do: "Route Browser → Next.js server route → RunPod/Ollama, keeping secrets server-side.",
  },
  {
    title: "Measure and publish",
    why: "A good portfolio case needs evidence, not only a successful demo.",
    do: "Run the fixed benchmark, record costs and failures, deploy on Vercel, and publish the exact lessons learned.",
  },
];

export default function BuildPage() {
  return (
    <div className="min-h-screen">
      <AppHeader active="build" />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="max-w-4xl">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Reproduce the experiment</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">From zero to your own cloud-hosted open LLM.</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            This page is the compact map. The full guide adds screenshots, exact commands, real costs, and every problem encountered during the live build.
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Critical trust boundary</p>
            <h2 className="mt-2 text-2xl font-semibold">No hosted LLM API in the inference path.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Infrastructure is still hosted by Vercel and RunPod. The claim is narrower and verifiable: the prompt is not delegated to a hosted model provider such as OpenAI or Anthropic.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Record these facts</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              <li>• exact GPU and hourly price</li>
              <li>• exact model tag and runtime</li>
              <li>• successful API proof and latency</li>
              <li>• benchmark results and real misses</li>
              <li>• gross and net experiment cost</li>
              <li>• what failed and how it was fixed</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
