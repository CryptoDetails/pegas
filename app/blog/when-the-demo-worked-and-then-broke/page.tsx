import type { Metadata } from "next";
import { ArticleCallout, ArticleImage, ArticleLink, ArticleLinks, BlogArticle } from "@/components/BlogArticle";

export const metadata: Metadata = {
  title: "When the Demo Worked - and Then Everything Broke | Pegas",
  description: "A practical Pegas case study about persistent storage, cloud networking, Ollama runtime completeness, and proving NVIDIA L4 GPU inference after a restart.",
};

export default function ArticleTwoPage() {
  return (
    <BlogArticle
      title="When the Demo Worked - and Then Everything Broke"
      subtitle="Part 2: what persistent storage, cloud networking, and GPU detection taught us"
    >
      <p><em>A practical case study for people who are not ML engineers</em></p>
      <p>We had already crossed the exciting milestone: the model was no longer a mock. A browser request went through the Next.js server, reached the cloud GPU, came back as structured JSON, and appeared in the interface with live metadata. One successful request later measured <strong>1.628 seconds</strong> end to end. That number is a single live request, not a benchmark.</p>

      <h2>The new goal</h2>
      <p>The next step was not to make the model smarter. It was to make the system less fragile. We wanted three things that sound boring until they fail:</p>
      <ul>
        <li>Keep the model files between GPU sessions so we did not have to download gigabytes every time.</li>
        <li>Expose the Ollama API in a way the frontend could reliably reach after a restart.</li>
        <li>Prove that successful answers were actually generated on the NVIDIA L4, not quietly falling back to CPU.</li>
      </ul>

      <h2>1. Persistence worked - but it was only one layer</h2>
      <p>We created a RunPod Global Volume, mounted it at <code>/workspace</code>, and stored the Qwen3 model there. That part worked: after stopping and starting the pod, <code>ollama list</code> could see <code>qwen3:4b</code> immediately without downloading the model again. Persistence was real.</p>
      <p>But preserving files is not the same as preserving a working inference stack. Ollama itself contains more than a single executable, model loading behavior matters, and the networking layer is separate again. We had solved storage, not the whole system.</p>

      <h2>2. A healthy-looking endpoint that returned 404</h2>
      <p>Next we tried to give Ollama its own exposed HTTP port. The root page said “Ollama is running”, which looked reassuring. But real API paths such as <code>/api/version</code>, <code>/api/tags</code>, and <code>/api/generate</code> repeatedly returned HTTP 404 through the RunPod HTTPS proxy. We reproduced the same behavior on multiple ports, so changing port numbers was not a solution.</p>
      <ArticleCallout label="What the failures actually taught us">
        Storage, runtime, networking, and accelerator selection can all fail independently while the rest of the stack still looks healthy. “The model works” is not one binary state.
      </ArticleCallout>

      <h2>3. One Ollama binary was not the whole runtime</h2>
      <p>To avoid reinstalling Ollama after a reset, we initially copied the <code>ollama</code> executable to persistent storage. The API could start and <code>/api/tags</code> could list the model, so this looked promising. Then the first real generation request failed with a much more useful error: <code>llama-server binary not found</code>.</p>
      <p>That error clarified the architecture. Ollama is not just one command-line binary. Its inference runtime includes additional libraries and the <code>llama-server</code> component. Listing models proved that metadata was readable; it did not prove that the full inference engine was present. We stopped trying to preserve partial runtime state and returned to a clean installation on each fresh pod.</p>

      <h2>4. The most expensive false positive: the GPU existed, but the model was on CPU</h2>
      <p>The next trap was more subtle. <code>nvidia-smi</code> correctly showed an NVIDIA L4 and available CUDA. The container absolutely had a GPU. Yet <code>ollama ps</code> reported <strong>100% CPU</strong>. The model still answered, but cold loading took roughly 95 seconds and generation dropped to only a few tokens per second. A “working” model had quietly become the wrong model path.</p>
      <ArticleImage src="/blog/article2-cpu-runtime.png" width={944} height={249} alt="Ollama process listing for qwen3:4b showing the model running on 100 percent CPU instead of GPU." caption="A successful response was not enough. This process listing exposed the wrong execution path." />
      <p>The fix was to make the backend choice explicit. Starting Ollama with <code>OLLAMA_LLM_LIBRARY=cuda_v13</code> and <code>OLLAMA_VULKAN=0</code> produced a clear runtime log: <code>library=CUDA</code>, <code>description=NVIDIA L4</code>. On the clean pod, <code>ollama ps</code> then reported <strong>100% GPU</strong> again.</p>
      <ArticleImage src="/blog/article2-gpu-runtime.png" width={515} height={450} alt="Ollama process listing for qwen3:4b showing the model running on 100 percent GPU." caption="Same model, corrected runtime path: Ollama now reports 100% GPU." />
      <p>Same Qwen3 4B model, two execution paths. A successful response is not proof that the GPU is being used.</p>

      <h2>5. The reset that finally simplified everything</h2>
      <p>After too many layers of partial fixes, we did the obvious thing: we terminated the messy pod and rebuilt a clean one using what we had learned. We kept the persistent volume as an experiment and backup, but stopped using it as the live model store. The working inference path returned to local pod storage, where Qwen3 4B had behaved well from the beginning.</p>
      <p>Direct TCP solved the networking block. A request from a normal Windows PowerShell session reached Ollama and returned <code>PEGAS_OK</code>. We then updated the server-side <code>MODEL_BASE_URL</code> in Vercel, redeployed, and ran the same integration scenario from the public Pegas frontend.</p>
      <p>Back online: live structured inference from the public frontend. This request measured <strong>1628 ms</strong> and passed schema validation.</p>

      <h2>Where we ended up</h2>
      <ul>
        <li>The public frontend again reaches Qwen3 4B through the Next.js server route.</li>
        <li>Ollama is running on a clean RunPod pod with the NVIDIA L4 explicitly selected through CUDA.</li>
        <li><code>ollama ps</code> confirmed 100% GPU for the model.</li>
        <li>External access currently uses RunPod Direct TCP rather than the HTTPS proxy that returned 404 for <code>/api/*</code> in our tests.</li>
        <li>The Direct TCP endpoint is configuration, not code, and its external port can change after a restart.</li>
        <li>This demo path is plain HTTP without a dedicated application-level auth layer, so it is not the final production security design.</li>
      </ul>

      <h2>What we would do differently next time</h2>
      <p>First, verify each layer separately before combining them. Second, treat GPU usage as something to measure, not assume. Third, keep infrastructure addresses outside the code from day one. Fourth, do not confuse persistence with readiness: preserving model files is useful, but a restarted system still needs its runtime, network path, and accelerator to be healthy.</p>
      <p>And finally, do not be afraid to throw away a complicated intermediate setup. After enough debugging, a clean rebuild can be faster than preserving every workaround. The important part is not avoiding failure. It is leaving the experiment with a smaller, better-tested architecture than the one you started with.</p>
      <p>The first Pegas article was about proving that one person could run an open model on rented GPU infrastructure. This second chapter was about something less glamorous and more valuable: learning what has to be true for that proof to keep working after the first successful demo.</p>

      <ArticleLinks>
        <ArticleLink href="/" eyebrow="Product" title="Try the live proof" />
        <ArticleLink href="/benchmark" eyebrow="Evidence" title="Run the benchmark" />
        <ArticleLink href="/build" eyebrow="Reproduce it" title="Read the build guide" />
      </ArticleLinks>
    </BlogArticle>
  );
}
