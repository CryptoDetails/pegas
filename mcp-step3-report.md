# MCP Step 3 — report

## Changed files

- `components/ModelRuntimeControl.tsx` — Part A
  - `review_completed` now counts as an agent finish, alongside `agent_completed` and `agent_failed`.
  - New prop `running: boolean`. When it changes from `true` to `false` while the state is `in_use`, the active-agent counter goes to 0 and the state becomes `ready` with a new warm window.
  - Lint error `react-hooks/set-state-in-effect` is fixed without `eslint-disable`. The event effect is gone. Transitions now happen during render ("adjust state while rendering when a prop changes"). The last processed `events` array, the processed event ids and the previous `running` value are kept in state. `activeAgents` moved from a ref into the runtime state object, so the warmup callback reads it through functional `setRuntime` updates.
  - States, texts, the 150 s window, the absolute `expiresAt` countdown and the warmup call are unchanged. No new timers.
- `components/RequestDeskWorkspace.tsx` — `review_completed` added to the `runtimeEvents` filter; `running={busy}` passed to `ModelRuntimeControl`.
- `app/build/page.tsx` — Part B: GuideRow `07` and a "Connect your own agent" section placed below the Model runtime / Payment proof section. It stays a server component.
- `lib/blogContent.ts` — `mcpServerArticleMarkdown` (full article including front matter).
- `app/blog/pegas-mcp-server-tool-not-authority/page.tsx` — new article page.
- `app/blog/page.tsx` — Article 8 · Latest added; article 7 label is now `Article 7`.
- `app/blog/pegas-agentic-finance-x402-solana/page.tsx` — "Next" link to article 8, placed first.
- `PEGAS_MCP_ARTICLE.md` — deleted after embedding.

## Checks

- `npm run lint` — clean (0 errors, 0 warnings).
- `npm run build` — success; `/blog/pegas-mcp-server-tool-not-authority` is prerendered as static.
- `npm run test:payments:all` — policy, protocol and workflow tests passed.
- Manual Part A check — **not done.** A production build served locally (`next start`) returned `model_error` with `backend_response_received: false` at Intake right away, so the local environment could not reach the model. It is not verified that the indicator shows **Ready** after a real run. Please check it on a preview or production deploy: run one standard request in Web form mode; afterwards the indicator should show Ready with a countdown.

## Deviations / notes

- `react-hooks/purity` does not allow `Date.now()` during render. So a finish transition made during render sets `state: "ready"` with `expiresAt: null`. On its first tick (run synchronously when the effect mounts), the existing countdown effect sets the absolute `expiresAt = now + warmWindowSeconds`. In practice the window starts at the same moment as before. The Warm-up path still sets `expiresAt` directly.
- Markdown renderer: front matter, `>` blockquotes and ```` ```text ```` blocks were already supported, so they are left as written. Tables are not supported, so the one tools table was converted into a bullet list (`- **tool**: description. Spends: …`). The renderer is unchanged, and all other article text is verbatim.
- The `ModelRuntimeControl` safety net applies whenever `busy` ends, in both Web form and MCP agent modes.
