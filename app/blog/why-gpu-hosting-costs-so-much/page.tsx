import type { Metadata } from "next";
import { ArticleLink, ArticleLinks, BlogArticle } from "@/components/BlogArticle";

export const metadata: Metadata = {
  title: "Why Does Running an Open Model Cost So Much? | Pegas",
  description:
    "What we learned about GPU economics, CPU hosting, hosted inference, and why RunPod was a reasonable first choice for Pegas — even though it was not the final infrastructure answer.",
};

export default function GpuHostingEconomicsArticlePage() {
  return (
    <BlogArticle
      title="Why Does Running an Open Model Cost So Much?"
      subtitle="What we learned about GPU economics, CPU hosting, hosted inference, and why RunPod was a reasonable first choice for Pegas — even though it was not the final infrastructure answer."
    >
      <p>When we started Pegas, one thing looked strange almost immediately.</p>
      <p>A normal web project can live on inexpensive hosting. A small VPS may cost tens of dollars per month. But the moment we rented a GPU for a self-hosted LLM, the price suddenly became an hourly number.</p>
      <p>During our Pegas experiments, an NVIDIA L4 was shown at roughly <strong>$0.49 per hour</strong>, while an RTX 4090 configuration was around <strong>$0.74 per hour</strong>.</p>
      <p>Run that continuously and the monthly cost becomes significant very quickly.</p>
      <p>So the obvious question is: <strong>why does this cost so much, and why not just put the model on an ordinary server?</strong></p>

      <h2>A GPU server is not really “normal hosting”</h2>
      <p>For a normal web application, the server mostly needs a CPU, RAM, storage, and networking.</p>
      <p>That is enough for things like:</p>
      <ul>
        <li>serving web pages;</li>
        <li>running APIs;</li>
        <li>handling authentication;</li>
        <li>talking to a database;</li>
        <li>processing ordinary background jobs.</li>
      </ul>
      <p>Large-language-model inference is a different kind of workload.</p>
      <p>Generating text requires a huge number of matrix operations. GPUs are designed to execute many of these operations in parallel, while ordinary CPUs are general-purpose processors optimized for a much broader mix of tasks.</p>
      <p>That is the reason the infrastructure economics change.</p>
      <p>When we rent a GPU instance, we are not just renting “a server with more power.” We are renting access to a specialized accelerator with its own high-speed memory, power requirements, cooling, and limited availability in a data center.</p>
      <p>That hardware is expensive to buy and expensive to keep online.</p>
      <p>The hourly price reflects more than the card itself. The provider also has to pay for the host machine, electricity, cooling, networking, maintenance, idle capacity, and the fact that a GPU sitting unused still represents expensive hardware.</p>

      <h2>Could Pegas run on an ordinary CPU server?</h2>
      <p>Yes.</p>
      <p>This is important.</p>
      <p>Qwen3 4B is small enough, especially in a quantized format, that it can run on a normal server with sufficient system RAM.</p>
      <p>In fact, during an earlier Pegas debugging session, we accidentally proved this.</p>
      <p>The NVIDIA GPU was visible to the operating system, but Ollama did not select the CUDA backend correctly. The model fell back to CPU execution.</p>
      <p>The model still worked.</p>
      <p>The problem was performance.</p>
      <p>Inference slowed dramatically compared with the GPU path. The observed generation speed dropped to roughly <strong>6–7 tokens per second</strong>, cold starts became painful, and requests could become slow enough to hit timeouts.</p>
      <p>So the real question was never:</p>
      <blockquote>Can the model run on a CPU?</blockquote>
      <p>It can.</p>
      <p>The useful question was:</p>
      <blockquote>Can it run fast enough for a public interactive demo?</blockquote>
      <p>For Pegas, the GPU made that experience much more practical.</p>

      <h2>RAM and VRAM are not the same thing</h2>
      <p>A CPU server stores model data in ordinary system RAM.</p>
      <p>A GPU uses its own high-bandwidth memory, usually called VRAM.</p>
      <p>The difference matters because LLM inference repeatedly moves large amounts of model data through the compute pipeline.</p>
      <p>System RAM can hold the model, but GPU VRAM is designed to feed massively parallel compute much more efficiently.</p>
      <p>That is why a model that technically fits into an ordinary server can still feel much slower there.</p>
      <p>For a background batch job, that may be acceptable.</p>
      <p>For a live demo where someone clicks a button and waits for an answer, it may not be.</p>

      <h2>Why hosted LLM APIs can look much cheaper</h2>
      <p>There is another apparent contradiction.</p>
      <p>Using a commercial LLM API often feels cheaper than renting an entire GPU.</p>
      <p>The reason is utilization.</p>
      <p>With a hosted API, one user does not rent a whole accelerator. The provider operates a large shared cluster and spreads the cost across many customers and many requests.</p>
      <p>The user normally pays for usage, such as processed tokens, rather than for possession of a specific GPU for an hour.</p>
      <p>That model is economically efficient because the infrastructure can keep expensive hardware busy across thousands of workloads.</p>
      <p>But Pegas had a different goal.</p>
      <p>We specifically wanted to demonstrate:</p>
      <ul>
        <li>an open model;</li>
        <li>our own inference runtime;</li>
        <li>a rented GPU;</li>
        <li>our own server-side integration;</li>
        <li>no third-party hosted LLM API in the inference path.</li>
      </ul>
      <p>If we had replaced the backend with OpenAI, Anthropic, Together, Groq, Fireworks, or another hosted model API, the demo would still work — but it would no longer prove the same thing.</p>
      <p>The point of Pegas was not merely to call a model.</p>
      <p>The point was to show the infrastructure behind the inference.</p>

      <h2>Why we chose RunPod</h2>
      <p>For the original proof of concept, RunPod was a very reasonable choice.</p>
      <p>We needed something much simpler than building the same experiment directly on AWS, Google Cloud, or Azure.</p>
      <p>Traditional cloud GPU infrastructure can involve a large amount of setup before the model even starts:</p>
      <ul>
        <li>instance types;</li>
        <li>networking;</li>
        <li>firewall rules;</li>
        <li>IAM;</li>
        <li>storage;</li>
        <li>CUDA compatibility;</li>
        <li>drivers;</li>
        <li>ports;</li>
        <li>billing configuration.</li>
      </ul>
      <p>RunPod reduced that initial barrier substantially.</p>
      <p>The workflow looked closer to:</p>
      <ol>
        <li>choose a GPU;</li>
        <li>deploy a Pod;</li>
        <li>open a terminal;</li>
        <li>start the runtime.</li>
      </ol>
      <p>It also offered several things that matched Pegas well:</p>
      <ul>
        <li>hourly GPU rental;</li>
        <li>multiple GPU types;</li>
        <li>prebuilt CUDA and PyTorch environments;</li>
        <li>browser terminal access;</li>
        <li>persistent storage options;</li>
        <li>exposed HTTP and TCP ports;</li>
        <li>reusable templates;</li>
        <li>a relatively approachable UI.</li>
      </ul>
      <p>For the original question —</p>
      <blockquote>Can one person without an ML-engineering background rent a GPU, run Qwen3 4B, expose it through Ollama, and connect it to a normal web frontend?</blockquote>
      <p>— RunPod did its job.</p>
      <p>We proved the full path.</p>

      <h2>The problem appeared after the proof worked</h2>
      <p>The difficulty came later.</p>
      <p>Running a model once is not the same thing as operating it cleanly.</p>
      <p>For a portfolio project, we did not want to pay for a GPU 24/7.</p>
      <p>The ideal lifecycle looked simple:</p>
      <blockquote>
        Stop the GPU when we are done.<br />
        Start it later.<br />
        The demo comes back.
      </blockquote>
      <p>That is where the infrastructure became much more complicated than expected.</p>
      <p>Across repeated tests we encountered several different lifecycle problems:</p>
      <ul>
        <li>a stopped Pod could lose access to the physical GPU it had used;</li>
        <li>local persistent storage could tie the workload to a specific host;</li>
        <li>migration could create a new Pod identity;</li>
        <li>a new Pod identity meant a new HTTP proxy hostname;</li>
        <li>changing the hostname meant changing <code>MODEL_BASE_URL</code> in Vercel;</li>
        <li>Direct TCP endpoints could change after restarts;</li>
        <li>Global Volume persistence worked, but model loading from it performed poorly in our experiment;</li>
        <li>the model could unload from GPU memory after inactivity;</li>
        <li>the next request would then pay the cold-start cost again.</li>
      </ul>
      <p>None of these problems meant that RunPod was “bad.”</p>
      <p>They meant that we had crossed from a proof-of-concept problem into an operations problem.</p>

      <h2>GPU availability is part of the system</h2>
      <p>One of the clearest lessons came from GPU availability.</p>
      <p>The original Pegas proof used an NVIDIA L4.</p>
      <p>Later, when we tried to make the environment restartable, L4 availability in the selected region was low.</p>
      <p>An RTX 4090 was much easier to obtain.</p>
      <p>That forced an architectural realization:</p>
      <blockquote>If a demo can only restart when one specific GPU SKU happens to be available on one specific host, then the demo is not really restartable.</blockquote>
      <p>The infrastructure should be able to treat compatible GPU capacity as a pool, not as a machine that we hope is still waiting for us.</p>

      <h2>The economics explain the architecture</h2>
      <p>At this point the relationship between cost and architecture became much clearer.</p>
      <p>A dedicated GPU Pod is easy to understand:</p>
      <blockquote>This GPU is mine while it is running.</blockquote>
      <p>But that also means:</p>
      <blockquote>I pay while it is running, and I become responsible for its lifecycle.</blockquote>
      <p>A serverless GPU model changes the relationship:</p>
      <blockquote>Here is my runtime. Give it GPU capacity when a request needs it.</blockquote>
      <p>The provider can then handle the scheduling, reassignment, and scaling.</p>
      <p>That is much closer to what Pegas actually needs.</p>
      <p>The project does not require one physical RTX 4090 or one physical L4.</p>
      <p>It requires:</p>
      <ul>
        <li>a compatible NVIDIA GPU;</li>
        <li>our open model;</li>
        <li>our runtime;</li>
        <li>a stable HTTPS endpoint;</li>
        <li>persistence for model assets;</li>
        <li>predictable cold-start behavior.</li>
      </ul>

      <h2>The trade-off we discovered</h2>
      <p>Our later restartable RunPod configuration became much easier to operate than the original setup, but it also showed a performance trade-off.</p>
      <p>Warm requests that had previously been around <strong>2–4 seconds</strong> were now more commonly around <strong>4–6 seconds</strong>.</p>
      <p>After roughly five minutes of inactivity, the next request could again take around <strong>20 seconds</strong>, because the model had to become resident in GPU memory again.</p>
      <p>That distinction matters.</p>
      <p>There are really two latencies:</p>
      <ul>
        <li><strong>cold latency</strong> — infrastructure or model state has to be initialized;</li>
        <li><strong>warm latency</strong> — the model is already loaded and ready.</li>
      </ul>
      <p>A useful AI demo should measure both.</p>

      <h2>Why this was still a useful result</h2>
      <p>It would have been easy to stop Pegas as soon as the first successful inference appeared.</p>
      <p>That would have produced a cleaner story, but a less useful one.</p>
      <p>Instead, we tested what happens when the GPU is actually stopped, restarted, migrated, and left idle.</p>
      <p>That exposed the difference between:</p>
      <blockquote>“The model runs.”</blockquote>
      <p>and:</p>
      <blockquote>“The system is practical to operate.”</blockquote>
      <p>Those are not the same achievement.</p>

      <h2>What we would choose differently now</h2>
      <p>For a similar project, we would make infrastructure lifecycle a first-class requirement from the beginning.</p>
      <p>The requirements would be:</p>
      <ul>
        <li>one stable HTTPS endpoint;</li>
        <li>no manual terminal recovery;</li>
        <li>no model re-download after ordinary scale-down;</li>
        <li>no Vercel configuration changes after GPU reassignment;</li>
        <li>model persistence independent of a physical host;</li>
        <li>automatic access to compatible GPU capacity;</li>
        <li>explicit measurement of cold and warm latency;</li>
        <li>the ability to scale to zero when the demo is idle.</li>
      </ul>
      <p>That points away from a manually managed GPU Pod and toward a serverless GPU runtime.</p>
      <p>For Pegas, the next infrastructure experiment should be evaluated against those criteria before the frontend is connected to it.</p>

      <h2>The main lesson</h2>
      <p>Running an open-source model was not the hardest part.</p>
      <p>Making the system economical, restartable, and boring to operate was harder.</p>
      <p>The cost of GPU hosting is not just the price of faster hardware.</p>
      <p>It changes the architecture.</p>
      <p>And that is probably the most useful thing the Pegas experiment has taught us so far.</p>

      <ArticleLinks>
        <ArticleLink href="/blog/open-source-llm-cloud-gpu" eyebrow="Part 1" title="How We Ran an Open-Source LLM on a Cloud GPU" />
        <ArticleLink href="/blog/when-the-demo-worked-and-then-broke" eyebrow="Part 2" title="When the Demo Worked - and Then Everything Broke" />
        <ArticleLink href="/blog/making-self-hosted-llm-easy-to-restart" eyebrow="Part 3" title="Making a Self-Hosted LLM Easy to Restart Was Harder Than Running It" />
        <ArticleLink href="/" eyebrow="Product" title="Try the live proof" />
      </ArticleLinks>
    </BlogArticle>
  );
}
