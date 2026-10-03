import type { Metadata } from "next";
import { ArticleLink, ArticleLinks, BlogArticle } from "@/components/BlogArticle";

export const metadata: Metadata = {
  title: "The Hidden Work Behind a Simple LLM Restart | Pegas",
  description:
    "What we learned turning a fragile RunPod + Ollama setup into a restartable self-hosted LLM runtime, from storage choices and GPU availability to stable endpoints and cold starts.",
};

export default function ArticleThreePage() {
  return (
    <BlogArticle
      title="The Hidden Work Behind a Simple LLM Restart"
      subtitle="Stopping a cloud GPU is easy. Starting the same self-hosted LLM cleanly again was not."
    >
      <p>Getting an open model to answer one request on a rented GPU is one problem.</p>
      <p>Turning that experiment into something you can stop, start again, and trust without repeating a terminal ritual is a different problem entirely.</p>
      <p>That second problem turned out to be much more interesting than expected.</p>
      <p>Pegas already had a working inference path: Vercel sent requests to a RunPod GPU, Ollama served Qwen3 4B, and the frontend showed the result together with runtime evidence. The demo worked.</p>
      <p>But the restart procedure did not feel like a finished system.</p>
      <p>After stopping the GPU to avoid paying for idle compute, bringing the model back online meant reinstalling Ollama, starting the server with the right CUDA settings, checking that the model existed, verifying GPU usage, finding a new external TCP port, changing a Vercel environment variable, and redeploying.</p>
      <p>Technically reproducible? Yes.</p>
      <p>Operationally pleasant? Not even close.</p>
      <p>So we spent a session on one narrow goal:</p>
      <p><strong>Make restarting the self-hosted model boring.</strong></p>
      <p>That exposed several infrastructure lessons that were not obvious from the happy-path setup guides.</p>

      <h2>1. Installing the runtime on every start is the wrong abstraction</h2>
      <p>The first simplification was obvious in hindsight.</p>
      <p>Our old RunPod container was a general PyTorch image. Ollama was installed manually inside it. Because the container filesystem was disposable, stopping the Pod meant the runtime itself might need to be installed again later.</p>
      <p>The fix was to stop treating Ollama as something we install into the machine and instead make it the machine&apos;s job from the beginning.</p>
      <p>We created a dedicated RunPod template using the official:</p>
      <p><code>ollama/ollama</code></p>
      <p>container image.</p>
      <p>The template exposes port <code>11434</code> and defines the runtime configuration up front:</p>
      <pre><code>{`OLLAMA_HOST=0.0.0.0:11434
OLLAMA_MODELS=/workspace/ollama-models
OLLAMA_LLM_LIBRARY=cuda_v13
OLLAMA_VULKAN=0`}</code></pre>
      <p>Now starting the Pod also starts Ollama.</p>
      <p>No install script. No <code>nohup ollama serve</code>. No web terminal just to get the API online.</p>
      <p>That sounds like a small improvement. In practice, it removes an entire category of restart mistakes.</p>

      <h2>2. Persistent storage can still leave you stuck</h2>
      <p>The next assumption was: if the model survives a restart, the problem is solved.</p>
      <p>Not quite.</p>
      <p>We first put the model on a persistent Volume Disk attached to the Pod. It worked. Qwen3 4B remained available after stopping the instance.</p>
      <p>Then we tried to start the Pod again.</p>
      <p>RunPod refused because there was no free L4 on the original host machine.</p>
      <p>The important lesson was that persistence and mobility are different properties.</p>
      <p>A storage option can preserve your files perfectly while still making the compute instance awkward to resume if it is tied too closely to one host.</p>
      <p>For an experiment you switch on only when needed, GPU availability is not a side detail. It is part of the restart architecture.</p>

      <h2>3. The most portable storage was not automatically the fastest live model store</h2>
      <p>Pegas already had a Global Volume called <code>pegas-model-storage</code>.</p>
      <p>At first glance, it looked like the obvious answer. It is persistent and broadly accessible.</p>
      <p>But earlier tests had already shown an uncomfortable result: pointing Ollama directly at the model store on that Global Volume produced poor cold-load behavior in our setup.</p>
      <p>So we did not force the architecture toward the storage option with the nicest persistence story.</p>
      <p>Instead, we separated the questions:</p>
      <ul>
        <li>Where can the model survive the lifecycle we need?</li>
        <li>Where can Ollama load it with acceptable behavior?</li>
      </ul>
      <p>For the current runtime, a RunPod Network Volume gave us a better operational compromise.</p>
      <p>We created:</p>
      <pre><code>{`pegas-runtime-models
EU-RO-1
10 GB
mounted at /workspace`}</code></pre>
      <p>Ollama then uses:</p>
      <p><code>/workspace/ollama-models</code></p>
      <p>The model was pulled once through the Ollama HTTP API. After that, <code>/api/tags</code> showed <code>qwen3:4b</code> directly from the persistent volume.</p>
      <p>The web terminal was not involved.</p>

      <h2>4. GPU availability changed the hardware choice</h2>
      <p>The original Pegas proof used an NVIDIA L4, and it worked well once Ollama was explicitly forced onto the CUDA backend.</p>
      <p>But a restartable cloud setup should not become dependent on a single GPU name unless the workload truly requires that exact hardware.</p>
      <p>During this iteration, L4 availability in the selected RunPod region was low. RTX 4090 availability was high.</p>
      <p>Qwen3 4B does not need an L4 specifically, so the new runtime moved to a 24 GB RTX 4090.</p>
      <p>That was a useful reminder: cloud infrastructure is partly a scheduling problem.</p>
      <p>The best GPU for a small self-hosted demo is not only the GPU with the right specs and price. It is also the GPU you can actually start when you need it.</p>

      <h2>5. A stable HTTP path is more valuable than a clever TCP workaround</h2>
      <p>The old Pegas runtime exposed Ollama through RunPod Direct TCP.</p>
      <p>It worked, but the external IP and port mapping could change after a restart. That meant a restart could cascade into a Vercel configuration change and a redeploy.</p>
      <p>The new template exposes Ollama as an HTTP service on port <code>11434</code>.</p>
      <p>That gives the Pod a proxy URL in the form:</p>
      <p><code>https://&lt;POD_ID&gt;-11434.proxy.runpod.net</code></p>
      <p>During our tested Stop -&gt; Start cycle, the Pod ID stayed the same, the proxy URL came back, and Vercel did not need a new model endpoint.</p>
      <p>There is an important boundary here: if the Pod is terminated and replaced, the Pod ID changes, so the URL changes too.</p>
      <p>This is not a universal permanent hostname. It is simply much more stable for the lifecycle we actually use: stop compute when idle, restart the same Pod when needed.</p>

      <h2>6. &quot;Running&quot; and &quot;ready&quot; are not always the same moment</h2>
      <p>Immediately after one restart, an Ollama API URL returned HTTP 404.</p>
      <p>A short time later, the root endpoint returned:</p>
      <p><code>Ollama is running</code></p>
      <p>and <code>/api/tags</code> worked normally again.</p>
      <p>Nothing had been lost. The model was still present. The service simply needed time to come back through the full container + proxy path.</p>
      <p>This is a small operational detail, but it matters if you want restart automation later.</p>
      <p>A robust startup flow should test readiness rather than assume that &quot;Pod running&quot; means &quot;model API ready now.&quot;</p>

      <h2>7. Persistence worked. Cold start did not disappear.</h2>
      <p>After the storage and endpoint changes, we ran the real test:</p>
      <ol>
        <li>Stop the Pod.</li>
        <li>Start it again.</li>
        <li>Wait for Ollama to come back.</li>
        <li>Check <code>/api/tags</code>.</li>
        <li>Run inference from the public Pegas frontend.</li>
      </ol>
      <p>The model was still there. No pull was needed. Ollama started automatically. The public app successfully reached it through the new HTTPS proxy.</p>
      <p>But the first inference was still much slower than the second:</p>
      <pre><code>{`First request:  21,997 ms
Second request:  5,260 ms`}</code></pre>
      <p>That difference is the model cold start.</p>
      <p>Persistence means the model files are available. It does not mean the model is already loaded into GPU memory.</p>
      <p>The first real request still pays that loading cost.</p>
      <p>A future improvement is obvious: automatically warm the model after the Pod starts and keep it loaded before the first user arrives.</p>
      <p>We have not implemented that yet, and that distinction matters. A portfolio project is more useful when it shows the remaining edge instead of pretending the edge does not exist.</p>

      <h2>What the restart flow looks like now</h2>
      <p>The old operational path looked roughly like this:</p>
      <pre><code>{`Start Pod
-> install Ollama
-> start Ollama with the right CUDA settings
-> make sure the model exists
-> verify GPU
-> find the new TCP endpoint
-> update Vercel
-> redeploy
-> test the site`}</code></pre>
      <p>The current normal path is much smaller:</p>
      <pre><code>{`Start Pod
-> Ollama starts automatically
-> persistent model is already present
-> HTTP proxy comes back
-> Pegas can run inference`}</code></pre>
      <p>There is still startup time, and the first model request is still cold.</p>
      <p>But the runtime is no longer rebuilt by hand every time the GPU is switched back on.</p>

      <h2>The bigger lesson</h2>
      <p>The hard part of self-hosting a small LLM was not getting Qwen3 4B to produce text.</p>
      <p>The hard part was making the surrounding lifecycle predictable:</p>
      <ul>
        <li>which files survive;</li>
        <li>which storage performs well enough;</li>
        <li>which GPU is actually available;</li>
        <li>whether the endpoint changes;</li>
        <li>whether the runtime starts by itself;</li>
        <li>whether the model is merely stored or actually loaded;</li>
        <li>and how the frontend behaves while compute is still waking up.</li>
      </ul>
      <p>Those details are easy to hide when a hosted API handles the infrastructure for you.</p>
      <p>When you run the model yourself, they become the product.</p>
      <p>And that is exactly why this experiment is useful.</p>

      <ArticleLinks>
        <ArticleLink href="/blog/when-the-demo-worked-and-then-broke" eyebrow="Previous chapter" title="When the Demo Worked - and Then Everything Broke" />
        <ArticleLink href="/" eyebrow="Product" title="Try the live proof" />
      </ArticleLinks>
    </BlogArticle>
  );
}
