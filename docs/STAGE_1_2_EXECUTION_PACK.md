# PEGAS STAGE 1-2 EXECUTION PACK v2

Status: PREPARED, NOT EXECUTED  
Project: Pegas  
Date: 2026-10-02

## 1. Purpose

This pack is the exact execution plan for the first paid infrastructure session:

```text
RunPod Pod
  -> Ollama
  -> qwen3:4b
  -> local inference
  -> external HTTP API
  -> structured JSON smoke test
```

It is designed to minimize paid GPU time. The Pod has not been deployed yet, so nothing in this document is evidence that Stage 1 or Stage 2 is complete.

The milestone now has two outputs:

1. **Technical smoke-test evidence** — the model and HTTP API objectively work.
2. **Showcase Proof Run** — the same fact is captured as a simple, human-readable portfolio artifact showing the request path, model, GPU, runtime, latency, schema validity, and the absence of a hosted LLM API in the inference path.

## 2. Current decisions

- Provider: RunPod Pods.
- Base template: Runpod PyTorch 2.8.0, or the current equivalent if the exact template is no longer available at deployment time.
- Preferred GPU from the bootstrap session: NVIDIA L4 24 GB.
- Observed price during bootstrap: approximately $0.49/hour. Re-check the real price before deployment.
- Persistent/network volume: none for the first smoke test.
- Container disk shown during bootstrap: 30 GB.
- Model target: `qwen3:4b`.
- Ollama API internal port: `11434`.
- Qwen3 thinking mode for Pegas triage: disabled (`think: false`).
- Structured output: JSON Schema through Ollama `format`.
- Deterministic baseline: `temperature: 0`.

## 3. Important cost/storage consequence

For this first session we intentionally do not buy persistent storage.

RunPod documents that container-disk data is lost when a Pod is stopped/restarted. Because the model and Ollama installation will live on non-persistent storage in this experiment, assume the environment is disposable.

Practical consequence:

- finish the Stage 1-2 smoke test in one paid session;
- save screenshots/results outside the Pod;
- once evidence is captured, terminate the disposable Pod rather than treating it as a reusable environment;
- a later session may require installing Ollama and pulling the model again.

This is an intentional cost-vs-convenience tradeoff for the portfolio MVP.

## 4. Security warning for the smoke test

RunPod HTTP proxy makes an exposed HTTP port reachable from the public internet. RunPod's own guidance says exposed services should implement authentication.

For Stage 2, direct exposure of Ollama port `11434` is accepted only as a short-lived smoke-test setup while the Pod is actively supervised.

Do not treat a raw unauthenticated Ollama proxy URL as the final public-production architecture.

Before public Vercel deployment, the model endpoint must have an agreed authentication/access-control mechanism. The exact mechanism remains deliberately unresolved until the real endpoint behavior is tested.

Never commit the Pod ID, private endpoint details, credentials, or future auth tokens to the public repo.

## 5. Paid-session target

The session is successful only when all of the following are true:

- [ ] RunPod Pod is running on the actually selected GPU.
- [ ] GPU is visible from the container.
- [ ] Ollama is installed and serving.
- [ ] `qwen3:4b` is pulled successfully.
- [ ] local Ollama API responds.
- [ ] one local Qwen3 inference succeeds.
- [ ] RunPod HTTP proxy for port 11434 is reachable externally.
- [ ] external structured-output request succeeds.
- [ ] returned model content is valid JSON matching the Pegas schema.
- [ ] actual GPU, hourly price, Ollama version, exact model tag and test latency are recorded.
- [ ] evidence is saved outside the disposable Pod.
- [ ] one Showcase Proof Run is captured for README / portfolio / guide use.
- [ ] the proof artifact visibly distinguishes infrastructure hosting from hosted LLM inference.

Only then may Stage 1 and Stage 2 be marked COMPLETE and fully documented.

---

# PHASE A - BEFORE CLICKING DEPLOY

## A1. Re-open the Pod configuration

Use the RunPod web UI.

Expected baseline:

- Pod product, not Serverless.
- PyTorch template.
- Preferred GPU: L4 24 GB if available at a sensible price.
- One GPU only.
- No paid Network Volume for this first test.

If L4 is unavailable or the price is materially different, stop and re-evaluate the GPU choice before paying.

## A2. Configure Ollama HTTP access before deployment

In the Pod template/override settings:

1. Add internal HTTP port `11434` to **Expose HTTP Ports**.
2. Do not remove existing template ports such as JupyterLab if they are already present.
3. Add environment variable:

```text
OLLAMA_HOST=0.0.0.0
```

This is required because RunPod's HTTP proxy can only reach the service when it listens on all interfaces rather than localhost only.

## A3. Final pre-deploy evidence

Before clicking Deploy, capture one screenshot that shows as much of the following as practical:

- selected GPU;
- current hourly GPU price;
- template;
- storage configuration;
- HTTP port 11434 exposure;
- `OLLAMA_HOST=0.0.0.0`.

Do not capture or publish secrets.

Record the observed hourly price in `COST_LOG.md` after the session.

## A4. Start paid time

Click Deploy only when ready to continue immediately.

Record:

```text
Session start time: __________
GPU: __________
Hourly price: __________
Pod ID: __________  (private project evidence only)
```

---

# PHASE B - POD AND GPU VERIFICATION

Wait until RunPod shows the Pod as running and telemetry is present.

Open:

```text
Pods -> your Pod -> Connect -> Open Web Terminal
```

For this first smoke test, the Web Terminal is deliberately used only for a few infrastructure commands. There is no need to configure full SSH/remote VS Code before the model works.

## B1. Verify the actual GPU

Run:

```bash
nvidia-smi
```

Evidence to capture:

- GPU model;
- VRAM size;
- command succeeds without a CUDA/NVIDIA error.

If the GPU shown is not the GPU paid for, stop and investigate before continuing.

---

# PHASE C - INSTALL AND START OLLAMA

## C1. Install dependencies

Run:

```bash
apt update && apt install -y lshw zstd
```

## C2. Install Ollama and start the server

Run:

```bash
(curl -fsSL https://ollama.com/install.sh | sh && ollama serve > /tmp/ollama.log 2>&1) &
```

Keep the Pod session alive while completing the smoke test.

## C3. Verify Ollama

Run:

```bash
ollama --version
```

Then:

```bash
curl -s http://127.0.0.1:11434/api/tags
```

Success means:

- Ollama version prints;
- the API call returns JSON rather than connection refused.

If API access fails, inspect:

```bash
cat /tmp/ollama.log
```

Do not continue to model download until the local Ollama API works.

---

# PHASE D - PULL AND VERIFY QWEN3 4B

## D1. Pull the exact baseline model

Run:

```bash
ollama pull qwen3:4b
```

The official Ollama library currently lists `qwen3:4b` as a 4.02B-parameter model using the Q4_K_M quantization, approximately 2.5 GB. Record what `ollama list` actually shows in the real session rather than relying only on this preparation note.

## D2. Record the real installed tag

Run:

```bash
ollama list
```

Record:

```text
Ollama version: __________
Model tag: __________
Model size shown: __________
```

## D3. Local inference check

Run:

```bash
curl -s http://127.0.0.1:11434/api/chat -d '{"model":"qwen3:4b","messages":[{"role":"user","content":"Reply with exactly PEGAS_OK"}],"think":false,"stream":false}'
```

Success criteria:

- HTTP call completes;
- response identifies `qwen3:4b`;
- assistant content is present;
- no fatal model/GPU error occurs.

The exact wording is less important than a successful real inference.

Optional GPU evidence immediately after inference:

```bash
nvidia-smi
```

or, if available in the installed Ollama version:

```bash
ollama ps
```

Capture enough evidence to show that the rented GPU is actually being used for the local model workload.

At this point Stage 1 can be considered technically satisfied only after the evidence is reviewed.

---

# PHASE E - EXTERNAL HTTP REACHABILITY

## E1. Find the RunPod proxy URL

For exposed port `11434`, RunPod uses this pattern:

```text
https://POD_ID-11434.proxy.runpod.net
```

Do not publish the live URL in GitHub or screenshots intended for the public portfolio.

## E2. Basic external reachability

From your Windows machine, open this URL in a browser:

```text
https://POD_ID-11434.proxy.runpod.net/api/tags
```

Expected result: JSON listing the available Ollama model(s).

This verifies that:

```text
Internet -> RunPod HTTP proxy -> Pod:11434 -> Ollama
```

is reachable.

If the browser returns an error:

- verify port `11434` is exposed in the Pod;
- verify `OLLAMA_HOST=0.0.0.0`;
- verify local `curl http://127.0.0.1:11434/api/tags` still works;
- verify the Pod is actually ready/receiving telemetry;
- inspect Ollama log.

---

# PHASE F - STRUCTURED API SMOKE TEST FROM VS CODE

A ready request body is supplied in this pack as:

```text
SMOKE_TEST_REQUEST.json
```

It already contains:

- the Pegas baseline system prompt;
- allowed categories and priorities;
- JSON Schema;
- `stream: false`;
- `think: false`;
- `temperature: 0`;
- the canonical integration smoke-test message.

Expected label for this message:

```text
category = integration
priority = medium
```

`summary` and `nextAction` are judged structurally and semantically, not by exact wording.

## F1. Put the request file in an easy local folder

Open that folder in VS Code, or place the file in the future Pegas workspace.

## F2. Run one command in the VS Code PowerShell terminal

Replace `POD_ID` only:

```powershell
curl.exe -sS -w "`nHTTP %{http_code} | total %{time_total}s`n" -X POST "https://POD_ID-11434.proxy.runpod.net/api/chat" -H "Content-Type: application/json" --data-binary "@SMOKE_TEST_REQUEST.json"
```

This command sends the prepared JSON request and prints HTTP status plus wall-clock request time.

## F3. What a successful Ollama response looks like

Ollama's `/api/chat` response is a wrapper. The model's schema-constrained JSON is inside:

```text
message.content
```

The top-level response may also include runtime metadata such as durations and token counts.

Stage 2 success requires verifying that `message.content` parses as JSON containing exactly the expected Pegas fields:

```text
category
priority
summary
nextAction
```

with category and priority inside the allowed enums.

Do not require exact summary/next-action wording.

---

# PHASE G - EVIDENCE TO SAVE BEFORE SHUTDOWN

Save outside RunPod:

1. Pre-deploy configuration screenshot.
2. Pod running screen showing actual GPU and current hourly price.
3. `nvidia-smi` evidence.
4. `ollama --version` output.
5. `ollama list` output.
6. Local inference response.
7. External structured request response.
8. HTTP status and measured wall-clock time from the external request.
9. Approximate paid-session start and end times.

Fill this record:

```text
GPU: ______________________________
Hourly price: _____________________
RunPod template: __________________
Ollama version: ___________________
Model tag: ________________________
Model size/quantization: __________
Local inference: PASS / FAIL
External API: PASS / FAIL
Structured JSON: PASS / FAIL
Expected category: integration
Actual category: __________________
Expected priority: medium
Actual priority: __________________
External request time: ____________
Paid session start: _______________
Paid session end: _________________
Notes: ____________________________
```

---

# PHASE H - SHUTDOWN

Because this first setup intentionally has no persistent/network volume, do not assume the installed environment will survive a stop/restart.

After all evidence has been saved and reviewed:

1. Confirm the evidence is local/outside the Pod.
2. Stop paid GPU usage immediately.
3. If there is no data worth retaining, terminate the disposable Pod rather than paying storage for an environment we intentionally chose not to persist.
4. Record the actual billed runtime/cost in `COST_LOG.md`.

Do not terminate until the smoke-test response and screenshots are safely saved outside RunPod.

---

# 6. Stage gates after execution

## Stage 1 - GPU / Model Infrastructure COMPLETE only if

- real RunPod GPU verified;
- Ollama running;
- `qwen3:4b` present;
- real local inference succeeded.

## Stage 2 - Infrastructure Smoke Test COMPLETE only if

- port 11434 reachable through the RunPod HTTP proxy;
- one external `/api/chat` request succeeded;
- model response conforms to the Pegas structured-output schema;
- actual runtime facts were recorded.

After Stage 2 is confirmed:

```text
Infrastructure Smoke Test: COMPLETE
Next: Stage 3 - Frontend Base
```

Only then may Coding Session A begin.

---

# 7. Troubleshooting order

Use this order rather than changing multiple things at once.

## Pod not ready

- Check RunPod telemetry and logs.
- Confirm the Pod really has a GPU.

## `nvidia-smi` fails

- Do not install random CUDA packages.
- Confirm GPU/template compatibility and RunPod machine state first.

## Ollama install fails

- Verify internet access from the Pod.
- Re-run only after reading the actual installer error.

## `localhost:11434` connection refused

- Check `/tmp/ollama.log`.
- Confirm the `ollama serve` process is running.

## Local works, external proxy fails

- Confirm HTTP port 11434 exposure.
- Confirm `OLLAMA_HOST=0.0.0.0`.
- Confirm RunPod proxy URL uses the real Pod ID and internal port 11434.

## External request times out

- First confirm local inference still works.
- Note that RunPod's HTTP proxy has a 100-second connection limit through its proxy path.
- Do not add retries or change architecture until the actual bottleneck is identified.

## JSON is invalid or wrong shape

- Confirm `format` contains the schema.
- Confirm `stream` is false.
- Confirm `think` is false.
- Confirm temperature is 0.
- Save the raw response for later prompt/schema analysis rather than silently changing the ground truth.

---

# 8. Verified external facts used in this pack

Preparation was checked against current official documentation on 2026-10-01:

- RunPod tutorial: Set up Ollama on a Pod
  https://docs.runpod.io/tutorials/pods/run-ollama
- RunPod: Expose ports
  https://docs.runpod.io/pods/configuration/expose-ports
- RunPod: Connection options
  https://docs.runpod.io/pods/connect-to-a-pod
- RunPod: Manage Pods / storage behavior
  https://docs.runpod.io/pods/manage-pods
- RunPod: Storage options
  https://docs.runpod.io/pods/storage/types
- Ollama Linux install
  https://ollama.com/download/linux
- Ollama structured outputs
  https://ollama.com/blog/structured-outputs
- Ollama thinking control
  https://ollama.com/blog/thinking
- Ollama qwen3:4b model page
  https://ollama.com/library/qwen3:4b

If the RunPod UI differs at execution time, use the live UI as the source of truth and adapt before paying.


---

# PHASE H - SHOWCASE PROOF RUN

The raw API response proves that the system works. This phase turns that technical fact into a visual proof that a non-engineer can understand in seconds.

## H1. Use the canonical demo message

```text
Hi, we are building a wallet and would like to integrate your swap API. Could your team share technical requirements and documentation?
```

Expected baseline classification:

- category: `integration`;
- priority: `medium`.

Do not force the model to match those labels by editing its answer. The proof should show the actual response.

## H2. Capture the visible path

The public-facing proof should show:

```text
Browser -> Pegas API -> Cloud GPU -> Ollama -> Qwen3 4B -> structured result
```

## H3. Show the proof metadata

Capture the real values:

- exact model tag;
- actual GPU;
- runtime: Ollama;
- request latency;
- structured-output validity;
- hosted LLM API: none in the inference path.

Required clarification near the trust claim:

> Vercel and RunPod still provide infrastructure. The difference is that model inference is not delegated to a hosted LLM API.

## H4. Save reusable evidence

Save at least:

- one clean screenshot;
- optional short GIF/video of the request path;
- raw JSON response;
- completed `SMOKE_TEST_EVIDENCE_TEMPLATE.md`.

Use the same artifact later in README, case study, beginner guide, and social/demo material.

## H5. Shut down paid compute

Once evidence is safely stored outside the Pod, stop/terminate the disposable Pod according to the chosen storage strategy and record the real session cost in `COST_LOG.md`.
