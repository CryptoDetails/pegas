# PEGAS — CODER TASK: STEP 4 — MCP visible on the homepage + "Pegas receipt" card inside Claude (MCP App)

Pegas is a **visual demo**. Everything in this task must look polished, calm and self-explanatory to a non-technical visitor. Keep the existing site style (slate/indigo palette, rounded-3xl cards, `card-shadow`, generous whitespace). Do not create "card soup".

Two independent parts. Architecture decisions are final. No changes to payments, orchestrators, prompts, validators, x402 or Modal.

---

## PART 1 — Make MCP visible on the homepage

Files: `components/AgenticFinanceHero.tsx`, `components/RequestDeskWorkspace.tsx`, a new `components/ConnectAgentSection.tsx`.

### 1.1 Hero

- Add a chip **"MCP server"** to the existing chip row (x402 V2 · Solana Devnet · …). Give it a subtle indigo accent so it reads as "new", not a loud badge.
- In the right "What this run demonstrates" box, keep the primary button "Run the Agentic Finance demo" and add a secondary button directly under it:
  **"Try it as an AI agent (MCP)"**. Same width, outline style.
- New prop `onRunAgentDemo`. In the workspace it:
  1. sets the channel to "AI agent via MCP";
  2. switches the scenario to Paid Legal (paid preset);
  3. scrolls to the form, like `focusAgenticFinanceDemo`.

  Nothing is sent automatically.
- Update the caption under the buttons to:
  > Selects the paid Legal scenario and focuses the workspace. Nothing is submitted or paid until you choose Send. The second button lets a built-in AI agent call Pegas over MCP instead of the web form.

### 1.2 Toggle hint (web mode)

Under the "Web form / AI agent via MCP" toggle, when **Web form** is active, show one muted line:

> New: switch to "AI agent via MCP" to watch an external AI agent hire Pegas.

Agent mode keeps its current note.

### 1.3 New section `ConnectAgentSection`

Place it on the homepage between the demo grid and the "Explore the thinking behind the demo →" link. Always visible.

Layout: one wide card, two columns on desktop, stacked on mobile (no horizontal scroll at 360px).

**Left column**

- eyebrow: `MCP SERVER · LIVE`
- heading: `Connect your AI agent to Pegas`
- text: `Pegas is a remote MCP server. Add it to Claude, Cursor or any MCP client, and your assistant can route requests and buy a Legal consultation from Pegas, under Pegas' own bounded mandate.`
- URL box: monospace `https://pegas-rouge.vercel.app/api/mcp`, built from `window.location.origin` on the client, with a **Copy** button. Show "Copied" for 2 seconds.
- 3 numbered steps:
  1. `In Claude, open Customize → Connectors → Add custom connector.`
  2. `Paste the URL and choose no sign-in.`
  3. `In a new chat, ask: "Use Pegas to review this NDA clause…"`
- small muted line: `In Claude you get a live Pegas receipt card right in the chat.`
- links: `How it works → Guide` (`/build`) and `Read the story → Blog` (`/blog/pegas-mcp-server-tool-not-authority`).

**Right column** — "What your agent gets / never gets"

Two clean lists, with a clear visual contrast (check vs. lock icon, inline SVG, outlined, monochrome):

- **Your agent gets 3 tools**
  - `submit_request` — free routing by Pegas agents
  - `request_legal_consultation` — one Legal consultation for 0.01 test USDC
  - `get_payment_evidence` — read-only proof of payment
- **Your agent never gets**
  - payment keys or signing
  - control over price, seller, network or token
  - more than one payment per mandate

Footer line, emphasized: **`A tool, not authority.`**

---

## PART 2 — "Pegas receipt" MCP App (interactive card inside Claude)

### 2.1 What it is

An MCP App is a `ui://` HTML resource that MCP Apps hosts (the Claude desktop app, claude.ai) render as an inline card in the conversation, fed with the tool result.

Docs, read them first:
- https://claude.com/docs/connectors/building/mcp-apps/quickstart
- https://claude.com/docs/connectors/building/mcp-apps/design-guidelines
- https://modelcontextprotocol.net/extensions/apps/overview

Text-only clients (Claude Code, our browser client) must keep working exactly as now. The text `content` and `structuredContent` stay unchanged.

### 2.2 Server wiring (`lib/mcp/server.ts` + new `lib/mcp/receipt-app.ts`)

- We use MCP SDK **v2** (`@modelcontextprotocol/server` 2.2.0 via `mcp-handler` 2.2.0). Do not add SDK v1.
- Register one resource `ui://pegas/receipt` with mimeType `text/html;profile=mcp-app` (export a constant). Its `text` is the card HTML (see 2.3).
  - Resource `_meta.ui`: `prefersBorder: true`, and `csp.resourceDomains: [SITE_ORIGIN]`.
  - `SITE_ORIGIN` comes from `lib/site.ts` if it already defines the production URL; otherwise use `https://pegas-rouge.vercel.app` as a constant there.
- Add `_meta: { ui: { resourceUri: "ui://pegas/receipt" } }` to the `submit_request` and `request_legal_consultation` tool definitions. Also add the legacy flat key `"ui/resourceUri"` with the same value, as the docs' helper does. Not on `get_payment_evidence`.
- You may use the server helpers from `@modelcontextprotocol/ext-apps` **2.0.3** (it pairs with SDK v2) if they work with `mcp-handler`'s `McpServer`. If they fight the adapter, register the resource and `_meta` manually. Same result either way.
- Improve the `agent_name` description on both tools to:
  `Name of the calling assistant or product, for example "Claude" or "Cursor". Self-declared and not verified; shown in the Pegas receipt.`

### 2.3 The in-frame client script

- The card needs the MCP Apps browser client (`App` from `@modelcontextprotocol/ext-apps` 2.0.3).
- Do **not** load it from a public CDN. Copy the package's prebuilt self-contained browser bundle (the 2.x equivalent of `dist/src/app-with-deps.js`; find the right file in the installed package) into `public/mcp-app/ext-apps-app-2.0.3.js`. Commit it as a static file.
- The card loads it with `import { App } from "<SITE_ORIGIN>/mcp-app/ext-apps-app-2.0.3.js"`. CSP `resourceDomains` allows `SITE_ORIGIN`.
- Wire it like the docs: set `ontoolinput` and `ontoolresult` before `await app.connect()`.
- External links (Explorer, Pegas demo) must open through the host's open-link API on `App` (for example `app.openLink({ url })`; check the real 2.0.3 API name). No plain `target=_blank`.

### 2.4 Card design (inline card)

Follow the design guidelines strictly:
- inline card, height auto-fits, no inner scroll;
- max 2 actions at the bottom;
- 4–5 data points;
- host style tokens for all structural colors (`var(--color-background-primary)`, `--color-text-*`, `--color-border-*`, `--border-radius-*`, `--font-*`), with sensible fallbacks;
- light and dark must both look right;
- Pegas indigo `#4F5DF5` only as an accent;
- works from 320px width;
- 44px tap targets;
- skeleton while waiting, no spinner.

**States**

1. **Waiting** (after `ontoolinput`, before the result): header "Pegas is working…", skeleton rows, muted line `Self-hosted model on a scale-to-zero GPU. The first call can take up to 90 seconds.`

2. **Paid result** (`scenario: "paid_legal"`):
   - **Header:** Pegas logo (`<SITE_ORIGIN>/brand/pegas-logo.png`, 24px) + `Pegas · Legal consultation` + a status chip:
     - `Paid & verified` (success tokens) if the payment is confirmed or finalized;
     - `Declined — nothing spent` (warning tokens);
     - `No payment needed` (neutral) if `payment` is null;
     - `Stopped — nothing spent` (danger tokens) if failed before payment.
   - **Delegation chain** (the visual centerpiece): three pills with arrows, wrapping on narrow screens:
     `<declared_name> · external agent, not verified` → `Pegas Routing · registered` → `Legal Advisor · registered seller`.
     The first pill is dashed/outlined, the others solid. Under it, small caption: `Each step can only narrow authority. Your agent held no keys.`
   - **Mini progress strip:** dots with labels `Intake → Routing → Mandate → x402 → On-chain → Legal → Review`. Each is filled when the matching step type appears in `steps`.
   - **Data points:**
     - `Authority` — `AUTH 10/10 · mandate consumed`
     - `Payment` — `0.01 test USDC · Solana Devnet · finalized`
     - `Evidence` — `Verified via Alchemy` (only when `evidence_provider === "alchemy"`)
     - `Legal verdict` — the verdict in plain words (`human_review_required` → "Human review required") plus the first sentence of the advisory summary.
   - **Expandable row** `Show 10 policy checks` lists AUTH-01..AUTH-10 with pass/fail from `final_card.agentic_payment_evidence.policy.controls`. Expanding is allowed; no inner scroll.
   - **Actions:** `View transaction ↗` (explorer_url, if present) and `Open Pegas demo ↗` (SITE_ORIGIN).

3. **Standard result** (`scenario: "standard"`):
   - header `Pegas · Request routed` + outcome chip;
   - chain `<declared_name> → Pegas Request Desk`;
   - progress strip `Intake → Privacy → Routing → Review`, with skipped steps shown hollow;
   - data points: Department, Priority, Next action (2 lines max);
   - footer `Free flow · nothing spent`;
   - action `Open Pegas demo ↗`.

4. **Error** (`isError`): header + `Stopped at <agent label>` + the failure message + `Nothing was signed or spent` (unless payment evidence exists; then show the payment block as in 2).

Everything is derived from the tool result's `structuredContent` (`caller`, `payment`, `legal_consultation`, `steps`, `final_card`, `failure`, …). The card never calls tools by itself.

Keep the HTML self-contained, apart from the one App bundle and the logo. Keep it small and readable. Put the HTML template in `lib/mcp/receipt-app.ts` as an exported string.

### 2.5 Preview page (for review)

Add `app/mcp-receipt-preview/page.tsx`, not linked from the navigation. It renders the same receipt HTML three times in iframes (`srcDoc`) with **mock** results: paid success, standard success, declined. Add a light/dark switch that sets a few of the host CSS variables on the iframe body.

When not running inside a host, the card must fall back to reading a mock result from `window.__PEGAS_RECEIPT_MOCK__`. This lets the architect and owner see the card without Claude.

Add `<meta name="robots" content="noindex">` to this page.

---

## Checks

```
npm run lint
npm run build
npm run test:payments:all
```

Local protocol checks (no model, no payment):
- `tools/list` shows `_meta.ui.resourceUri = "ui://pegas/receipt"` on the two tools only;
- `resources/read` with `ui://pegas/receipt` returns mimeType `text/html;profile=mcp-app` and the HTML.

Open `/mcp-receipt-preview` locally and check all three mock states in light and dark at 360px and 720px widths. Save screenshots if your tools allow; otherwise describe them.

Do NOT call the paid tool or the paid web flow. Do NOT run `payments:live-smoke`.

## Report

Save `mcp-step4-report.md` in the project root (changed files, versions, checks, the exact App bundle file you used, the open-link API name, deviations). Then run:

```
git add -N components/ConnectAgentSection.tsx lib/mcp/receipt-app.ts app/mcp-receipt-preview/page.tsx public/mcp-app
git diff > mcp-step4.diff
```

No commit, no push, no deploy.
