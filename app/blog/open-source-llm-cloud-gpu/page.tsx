import type { Metadata } from "next";
import { ArticleCallout, ArticleImage, ArticleLink, ArticleLinks, BlogArticle } from "@/components/BlogArticle";

export const metadata: Metadata = {
  title: "How We Ran an Open-Source LLM on a Cloud GPU | Pegas",
  description: "RunPod + Ollama + Qwen3 4B: how Pegas proved a self-hosted open-model inference path on a rented NVIDIA L4 without a hosted LLM API.",
};

export default function ArticleOnePage() {
  return (
    <BlogArticle
      title="How We Ran an Open-Source LLM on a Cloud GPU"
      subtitle="RunPod + Ollama + Qwen3 4B: a practical proof, not a benchmark"
    >
      <p>Can one person rent a GPU, run an open model, expose it through an API, and get a valid structured response without sending inference to a hosted LLM API?</p>

      <h2>The short answer</h2>
      <p>Yes. We launched Qwen3 4B on a rented NVIDIA L4, served it with Ollama, verified GPU inference, exposed it through RunPod, and sent a structured request from a normal Windows machine. The final showcase request completed in <strong>2.602 seconds</strong> end to end and passed schema validation.</p>

      <h2>The setup</h2>
      <ul>
        <li>Cloud GPU: RunPod, 1x NVIDIA L4 (24 GB VRAM)</li>
        <li>Runtime: Ollama 0.35.0</li>
        <li>Model: qwen3:4b</li>
        <li>External test: Windows PowerShell → RunPod HTTPS proxy</li>
        <li>Output contract: category, priority, summary, nextAction</li>
      </ul>

      <h2>What we actually did</h2>
      <h3>1. Confirmed the GPU was real and visible</h3>
      <p>We ran <code>nvidia-smi</code> inside the pod and confirmed the NVIDIA L4, driver 570.195.03, and CUDA 12.8.</p>
      <ArticleImage src="/blog/article1-gpu-visible.png" width={1124} height={639} alt="Terminal output from nvidia-smi showing an NVIDIA L4 GPU, driver 570.195.03, and CUDA 12.8 inside the RunPod container." caption="The first layer of proof: the rented NVIDIA L4 is visible inside the container." />

      <h3>2. Installed Ollama and pulled Qwen3 4B</h3>
      <p>Ollama installed correctly, but the container had no running <code>systemd</code>, so we launched <code>ollama serve</code> manually. The qwen3:4b model download was about 2.5 GB.</p>

      <h3>3. Verified real GPU inference</h3>
      <p><code>ollama ps</code> reported <strong>100% GPU</strong>, confirming the model was not quietly falling back to CPU.</p>

      <h3>4. Learned that “valid JSON” is not enough</h3>
      <p>A plain JSON response can still break an application contract. We switched to JSON Schema and machine validation and got <code>SCHEMA_VALID</code>.</p>
      <ArticleImage src="/blog/article1-schema-valid.png" width={1897} height={399} alt="Terminal output showing a structured Qwen3 4B response followed by SCHEMA_VALID after JSON Schema validation." caption="A readable JSON response was not enough; the application contract had to be validated too." />

      <h3>5. Exposed the API without resetting the pod</h3>
      <p>Instead of editing the pod and triggering a reset, we reused the already exposed port 8888, stopped Jupyter Lab, and temporarily moved Ollama there.</p>

      <h3>6. Sent the final request from Windows</h3>
      <p>The final path was:</p>
      <p><code>Windows → RunPod HTTPS proxy → Ollama → Qwen3 4B → structured JSON</code></p>
      <p>The Showcase Proof Run reported:</p>
      <ul>
        <li>Model: qwen3:4b</li>
        <li>Runtime: Ollama 0.35.0</li>
        <li>External HTTP: OK</li>
        <li>Schema valid: True</li>
        <li>Measured latency: 2602 ms</li>
      </ul>
      <ArticleImage src="/blog/article1-showcase-proof.png" width={1096} height={456} alt="Windows PowerShell output from the Pegas showcase proof run showing the request path, qwen3:4b, Ollama 0.35.0, 2602 ms latency, and a schema-valid structured result." />

      <h2>What surprised us</h2>
      <ul>
        <li>Containers do not always behave like normal servers.</li>
        <li>JSON is not the same as a stable API contract.</li>
        <li>Infrastructure changes can be destructive.</li>
        <li>A public model endpoint is useful for a smoke test, not for the final app.</li>
      </ul>

      <h2>What we proved</h2>
      <ul>
        <li>NVIDIA L4 was available inside the pod.</li>
        <li>Ollama reported 100% GPU inference.</li>
        <li>qwen3:4b returned structured JSON matching our schema.</li>
        <li>The API was reachable externally through RunPod HTTPS proxy.</li>
        <li>One end-to-end Showcase Proof Run measured 2602 ms.</li>
      </ul>
      <ArticleCallout label="Measurement note">
        <strong>2602 ms is one measured showcase run, not a benchmark result.</strong>
      </ArticleCallout>

      <h2>Cost and next step</h2>
      <p>We stopped the GPU immediately after the proof run, so compute billing returned to $0.00/hour. RunPod billing data was still delayed, so we are waiting for the official billing record before publishing the final experiment cost.</p>
      <p>The next application path is:</p>
      <p><code>Browser → Next.js /api/analyze → RunPod → Ollama → Qwen3 4B → validated response → UI</code></p>
      <p>After that comes the frozen 25-case benchmark for accuracy, valid-output rate, latency distribution, real misses, and actual cost.</p>
      <p>For Pegas, this was the moment the project stopped being a polished frontend preview and became a real self-hosted AI proof.</p>

      <ArticleLinks>
        <ArticleLink href="/blog/when-the-demo-worked-and-then-broke" eyebrow="Continue to part 2" title="When the Demo Worked - and Then Everything Broke" />
      </ArticleLinks>
    </BlogArticle>
  );
}
