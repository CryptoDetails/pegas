# PEGAS — CODER TASK: STEP 3 (runtime indicator fix + Guide MCP section + Blog article 8)

Three small, independent parts. Implement exactly this. No new dependencies. No changes to payments, orchestrators, prompts, MCP server logic or Modal.

---

## Part A — Model runtime indicator stays "In use" after a run (+ old lint error)

### Bug (verified live in production)

After a finished run, the "Model runtime" block keeps showing **In use** indefinitely.

Cause: the Reviewer emits `agent_started` and then finishes with `review_completed`, not `agent_completed`. `RequestDeskWorkspace` passes only `agent_started | agent_completed | agent_failed` to `ModelRuntimeControl`, and the control counts only `agent_completed | agent_failed` as a finish. The active-agent counter never returns to 0.

The same gap appears whenever a run ends without a matching finish event: interrupted stream, workflow failure outside an agent, payment stop.

### Fix

1. `review_completed` counts as an agent finish (same as `agent_completed`), in both the workspace filter and the control.
2. Add a `running: boolean` prop to `ModelRuntimeControl`. The workspace passes `busy`. When `running` turns from `true` to `false` and the control is `in_use`:
   - reset the active-agent counter to 0;
   - switch to `ready` with a fresh warm window (same as after `agent_completed`).

   This is the safety net for every run end, in both Web form and MCP agent modes.
3. Fix the existing lint error `react-hooks/set-state-in-effect` at `ModelRuntimeControl.tsx:41`, without `eslint-disable`. Use the React pattern "adjust state while rendering when a prop changes": keep the last processed events length/ids and the previous `running` value in state or refs and derive the transitions during render. Moving the transitions into explicit callbacks called by the parent is also fine.

Keep everything else the same: states, texts, the 150 s window, the countdown based on an absolute `expiresAt`, the warmup call. No timers or polling beyond what already exists.

Files: `components/ModelRuntimeControl.tsx` and `components/RequestDeskWorkspace.tsx` (filter + prop only).

---

## Part B — Guide: "Let other agents call Pegas" (`app/build/page.tsx`)

1. Add a 7th `GuideRow`:

   - number: `07`
   - title: `Let other agents call Pegas`
   - mono: `External agent → MCP /api/mcp → same workflow and AUTH controls`
   - text:

     > Pegas is also a remote MCP server. Claude, Cursor or any client that supports remote MCP can call three tools: submit_request (free), request_legal_consultation (0.01 test USDC) and get_payment_evidence (read-only). The caller gets a tool, not authority: it holds no keys and cannot change price, seller, network, asset or count. The mandate records the caller as an unverified external agent, and all external agents share one narrower budget lane.

2. Below the existing "Model runtime / Payment proof" two-column section, add a section in the same visual style (border, uppercase eyebrow, mono line):

   - eyebrow: `Connect your own agent`
   - mono line: `https://pegas-rouge.vercel.app/api/mcp`
   - text:
     > In Claude: Customize → Connectors → Add custom connector, paste the URL, choose no sign-in. Then ask Claude to use the Pegas tools. You can also try it without any setup: on the Demo page, switch to "AI agent via MCP".
   - a link to `/` with text `Try the MCP agent mode on the Demo →`.

Keep it a server component. No copy button is needed here.

---

## Part C — Blog article 8

The full article text is in `PEGAS_MCP_ARTICLE.md` in the project root. Use it **verbatim**. Do not rewrite, shorten or "improve" the text.

1. `lib/blogContent.ts`: add `export const mcpServerArticleMarkdown = "..."`, holding the full file content including the front matter, in the same style as `agenticFinanceArticleMarkdown`.
2. Check how `components/MarkdownArticleBody.tsx` handles front matter, `>` blockquotes, ```` ```text ```` blocks and `|` tables.
   - If tables or blockquotes are not supported, do **not** change the renderer. Convert only those blocks inside the markdown string:
     - a table becomes a bullet list such as `- **submit_request**: Runs the free standard workflow… Spends: no.`;
     - a blockquote becomes a normal paragraph in italics.
   - Keep all other text exactly as written.
3. New page `app/blog/pegas-mcp-server-tool-not-authority/page.tsx`. Copy the structure of `app/blog/pegas-agentic-finance-x402-solana/page.tsx`:
   - metadata title: `Pegas Became an MCP Server: Other Agents Get a Tool, Not Authority | Pegas`
   - description: the article `summary`
   - `BlogArticle` title: the article title; subtitle: `How Pegas opened itself to external AI agents through the Model Context Protocol, and why the caller gets a tool but never payment authority.`
   - `ArticleLinks`:
     - Previous → article 7;
     - Product → `/` with "Try the MCP agent mode on the Demo";
     - Guide → `/build`;
     - Blog → `/blog`.
4. `app/blog/page.tsx`: add the article as `Article 8 · Latest` with the same title and subtitle as the page. Change article 7's label to `Article 7`.
5. On article 7's page, add one `ArticleLink` with eyebrow "Next" to article 8, as the first link.

After embedding, delete `PEGAS_MCP_ARTICLE.md` from the project root.

---

## Checks

```
npm run lint      (must now be fully clean)
npm run build
npm run test:payments:all
```

If a local dev server with the model is available, verify Part A manually in Web form mode: run one standard request. After it finishes, the indicator shows **Ready** with a countdown, not "In use". If no model is available locally, say so; do not fake it.

## Report

Save `mcp-step3-report.md` in the project root (changed files, checks, deviations). Then run:

```
git add -N app/blog/pegas-mcp-server-tool-not-authority/page.tsx
git diff > mcp-step3.diff
```

No commit, no push, no deploy.
