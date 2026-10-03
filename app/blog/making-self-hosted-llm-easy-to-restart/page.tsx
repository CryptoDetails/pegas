import type { Metadata } from "next";
import { ArticleCallout, ArticleLink, ArticleLinks, BlogArticle } from "@/components/BlogArticle";

export const metadata: Metadata = {
  title: "Making a Self-Hosted LLM Easy to Restart Was Harder Than Running It | Pegas",
  description: "What RunPod storage, GPU availability, persistent models, HTTP proxying, and cold starts taught us about turning a working AI demo into something practical to operate.",
};

export default function RestartableRuntimeArticlePage() {
  return (
    <BlogArticle
      title="Making a Self-Hosted LLM Easy to Restart Was Harder Than Running It"
      subtitle="What RunPod storage, GPU availability, persistent models, HTTP proxying, and cold starts taught us about turning a working AI demo into something practical to operate."
    >
      <h2>The demo already worked. Restarting it did not.</h2>
      <p>Pegas already had the part that usually gets the attention: a real browser request could reach a rented cloud GPU, Ollama could run Qwen3 4B, and the frontend could display a structured result.</p>
      <p>The harder operational problem appeared when we tried to use the project the way a small portfolio demo is actually used: turn the GPU off when nobody needs it, then bring it back later without rebuilding the whole runtime by hand.</p>
      <p>The old restart path was much too manual. After starting a RunPod Pod, we could end up reinstalling Ollama, starting it with the correct CUDA environment, checking that Qwen3 4B existed locally, verifying that inference was really using the GPU, finding the new Direct TCP address, updating <code>MODEL_BASE_URL</code> in Vercel, and redeploying.</p>
      <p>It worked, but it was not a good operating model. The goal of this iteration became simple: make a normal Stop → Start cycle boring.</p>

      <h2>First improvement: make Ollama part of the runtime</h2>
      <p>The first change was to stop treating Ollama as something we install after the machine starts. We created a RunPod template based on the official <code>ollama/ollama</code> image and exposed Ollama on HTTP port <code>11434</code>.</p>
      <p>The runtime configuration included:</p>
      <ul>
        <li><code>OLLAMA_HOST=0.0.0.0:11434</code></li>
        <li><code>OLLAMA_MODELS=/workspace/ollama-models</code></li>
        <li><code>OLLAMA_LLM_LIBRARY=cuda_v13</code></li>
        <li><code>OLLAMA_VULKAN=0</code></li>
      </ul>
      <p>That removed two recurring steps immediately: reinstalling Ollama and manually launching the server after every restart. Starting the Pod now also starts the inference service.</p>
      <ArticleCallout label="Why the CUDA settings stayed explicit">
        We had already seen a case where the machine had a visible GPU but Ollama still ran the model on CPU. GPU presence and GPU inference are not the same proof.
      </ArticleCallout>

      <h2>A stable HTTP endpoint changes a lot</h2>
      <p>The earlier live setup used RunPod Direct TCP. It was enough to expose Ollama, but the externally assigned TCP address could change after a restart. That meant a simple infrastructure restart could cascade into a Vercel environment-variable change and another deploy.</p>
      <p>The new template exposed Ollama through RunPod&apos;s HTTP proxy instead. Once the service was ready, the root endpoint returned <code>Ollama is running</code>, while <code>/api/tags</code> and <code>/api/generate</code> worked normally.</p>
      <p>We then pointed <code>MODEL_BASE_URL</code> at that proxy endpoint. For a normal Stop → Start of the same Pod, the frontend no longer needed a newly discovered TCP address.</p>
      <p>There is still an important boundary: if the Pod is terminated and replaced, its identity changes and so can its proxy address. This is a more stable lifecycle for the same Pod, not a claim that the endpoint is permanently immutable.</p>

      <h2>Persistence is not one problem</h2>
      <p>Our first persistence test used a RunPod Volume Disk. It did exactly one important thing correctly: the model files survived a Stop → Start cycle.</p>
      <p>Then the restart failed for a completely different reason. The Pod was tied to a physical host, and that host no longer had enough free GPU capacity to resume it.</p>
      <p>That exposed a distinction that is easy to miss when thinking only about files: persistent local storage can preserve the model while also coupling the workload to one host strongly enough that compute availability becomes the blocker.</p>
      <p>We therefore moved the live model store to a RunPod Network Volume in <code>EU-RO-1</code>. The volume size was <strong>10 GB</strong>, mounted at <code>/workspace</code>, while Ollama continued to use:</p>
      <p><code>/workspace/ollama-models</code></p>
      <p>Qwen3 4B was pulled once through Ollama&apos;s HTTP API. After the pull completed, <code>/api/tags</code> showed <code>qwen3:4b</code> from the persistent model store.</p>

      <h2>The GPU can become part of the failure mode</h2>
      <p>The original Pegas proof used an NVIDIA L4, and the existing articles correctly document those experiments.</p>
      <p>During this restart work, however, L4 availability in the selected RunPod region was low. RTX 4090 availability was much better, so the new live runtime moved to an RTX 4090.</p>
      <p>This was not an attempt to rewrite the historical hardware story or claim that one GPU is universally better. It was an infrastructure decision: Qwen3 4B did not require an L4 specifically, and an on-demand system is only useful if the compute can actually be scheduled when you want to restart it.</p>
      <ArticleCallout label="Operational lesson">
        A restartable cloud-GPU design should avoid depending on one exact GPU SKU unless the workload truly requires it. Availability is part of reliability.
      </ArticleCallout>

      <h2>The configuration that finally survived Stop → Start</h2>
      <p>The working combination for this iteration was:</p>
      <ul>
        <li>RTX 4090 compute in the selected RunPod region</li>
        <li>official <code>ollama/ollama</code> runtime template</li>
        <li>10 GB Network Volume mounted at <code>/workspace</code></li>
        <li>model store at <code>/workspace/ollama-models</code></li>
        <li>RunPod HTTP proxy on Ollama port <code>11434</code></li>
        <li>Qwen3 4B pulled once through the Ollama HTTP API</li>
      </ul>
      <p>We stopped the new Pod and started it again. Ollama started automatically. The HTTP proxy returned. <code>/api/tags</code> still showed <code>qwen3:4b</code>. No new model download was required.</p>
      <p>There was a short window during startup when an API request returned HTTP 404. A little later, the same service returned <code>Ollama is running</code> and its API routes worked normally again. The lesson was about readiness timing, not lost persistence or a permanently broken proxy.</p>

      <h2>The cold-start tax</h2>
      <p>Persistence solved the model-download problem. It did not mean the model was already loaded into GPU memory.</p>
      <p>That difference showed up in two observed live requests after restart:</p>
      <ul>
        <li>first inference: approximately <strong>21,997 ms</strong></li>
        <li>following inference: approximately <strong>5,260 ms</strong></li>
      </ul>
      <p>This was not a benchmark. It was a real pair of requests that exposed the remaining cold-start cost. The likely explanation is that the first request also had to load the model into GPU memory.</p>
      <p>Automatic model warm-up is the obvious next optimization, but it is <strong>not implemented yet</strong>. The current project still exposes that first-request penalty honestly.</p>

      <h2>What we would do differently now</h2>
      <ul>
        <li>Design and test restartability before treating the infrastructure as finished.</li>
        <li>Separate model persistence from container lifetime.</li>
        <li>Do not couple the architecture to one GPU SKU unless the workload requires it.</li>
        <li>Prefer stable HTTP service addressing over external TCP mappings that need to be rediscovered.</li>
        <li>Test a real Stop → Start cycle, not just the first successful deployment.</li>
        <li>Measure cold and warm inference separately.</li>
        <li>Keep infrastructure claims limited to what was actually verified.</li>
      </ul>

      <h2>Current operating model</h2>
      <p>The normal startup process is now much smaller:</p>
      <p><code>RunPod → Start Pod → wait for Ollama API Ready → Pegas can serve inference</code></p>
      <p>The model remains on persistent storage, Ollama starts with the runtime, and the normal Stop → Start path no longer requires rediscovering a Direct TCP address or downloading Qwen3 4B again.</p>
      <p>The next improvement is automatic warm-up so the first user request does not pay the full model-loading cost. That remains future work.</p>

      <ArticleLinks>
        <ArticleLink href="/blog/open-source-llm-cloud-gpu" eyebrow="Part 1" title="How We Ran an Open-Source LLM on a Cloud GPU" />
        <ArticleLink href="/blog/when-the-demo-worked-and-then-broke" eyebrow="Part 2" title="When the Demo Worked - and Then Everything Broke" />
        <ArticleLink href="/" eyebrow="Product" title="Try the live proof" />
        <ArticleLink href="/build" eyebrow="Reproduce it" title="Read the build guide" />
      </ArticleLinks>
    </BlogArticle>
  );
}
