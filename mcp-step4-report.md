# MCP Step 4 — report

## Changed files

**Part 1 — homepage**
- `components/AgenticFinanceHero.tsx` — "MCP server" chip (soft indigo outline) at the end of the chip row; secondary outline button "Try it as an AI agent (MCP)" under the primary one, same width; new prop `onRunAgentDemo`; new caption text.
- `components/RequestDeskWorkspace.tsx` — `focusAgentDemo()`: sets channel to MCP, then runs the existing `focusAgenticFinanceDemo()` (Paid Legal preset + scroll to the form). Nothing is sent. Muted hint under the Web form / MCP toggle in Web form mode. `<ConnectAgentSection />` placed between the demo grid and "Explore the thinking behind the demo →".
- `components/ConnectAgentSection.tsx` (new) — one wide card, two columns on `lg`, stacked below. The URL is read from `window.location.origin` via `useSyncExternalStore` (server snapshot = `SITE_ORIGIN`, so no hydration mismatch and no set-state-in-effect). Copy → "Copied" for 2 s. Check/lock icons are inline outlined SVGs.

**Part 2 — MCP App**
- `lib/mcp/receipt-app.ts` (new) — `RECEIPT_URI`, `RECEIPT_MIME_TYPE = "text/html;profile=mcp-app"`, `RECEIPT_TOOL_META`, `RECEIPT_RESOURCE_META`, `buildReceiptHtml(origin, mock?)` and `RECEIPT_HTML`. The HTML template is self-contained: inline CSS, inline module script, plus the App bundle and the logo from `SITE_ORIGIN`.
- `lib/mcp/server.ts` — registers resource `ui://pegas/receipt`, with `_meta.ui = { prefersBorder: true, csp: { resourceDomains: [SITE_ORIGIN] } }` both on the listing and on the `resources/read` content item. `_meta: { ui: { resourceUri }, "ui/resourceUri": … }` is on `submit_request` and `request_legal_consultation` only. The `agent_name` description is updated. Tool handlers, `content` and `structuredContent` are unchanged.
- `lib/site.ts` — `SITE_ORIGIN = "https://pegas-rouge.vercel.app"` (it was not defined before).
- `public/mcp-app/ext-apps-app-2.0.3.js` (new, static) — the App bundle.
- `public/mcp-app/ext-apps-LICENSE.txt` (new) — the package license, shipped next to the redistributed bundle.
- `next.config.ts` — `Access-Control-Allow-Origin: *` on `/mcp-app/:path*`. This is required: the card runs on the host's sandbox origin, and a cross-origin ES module import needs CORS. Vercel does not add CORS headers to `public/` files by default.
- `eslint.config.mjs` — ignore `public/mcp-app/**` (minified third-party bundle).
- `app/mcp-receipt-preview/page.tsx` + `app/mcp-receipt-preview/ReceiptPreview.tsx` (new) — review page with `robots: noindex, nofollow` (Next metadata API → `<meta name="robots" content="noindex, nofollow">`). Not linked anywhere.

## Versions

- `@modelcontextprotocol/server` 2.2.0, `mcp-handler` 2.2.0 — unchanged. No SDK v1 was added.
- `@modelcontextprotocol/ext-apps` **2.0.3** — used only as the source of the browser bundle (see below). It is **not** added to `package.json`.

## App bundle

- Source: `@modelcontextprotocol/ext-apps@2.0.3` tarball (`npm pack`), file **`dist/src/app-with-deps.js`** (export `./app-with-deps`). It is the same file name as in 1.x.
- Copied byte-for-byte to `public/mcp-app/ext-apps-app-2.0.3.js` (418,465 bytes, sha256 `fb56376b7583ecafb4820bdebc150abee18feb6258ff84b83c2c944ebd9c3602`). It is a self-contained ES module with no bare imports. It exports `App`, `applyDocumentTheme`, `applyHostStyleVariables`, `applyHostFonts`, etc.

## Open-link API

- `app.openLink({ url })` (2.0.3; `sendOpenLink` is the deprecated alias). Both actions ("View transaction ↗", "Open Pegas demo ↗") are `<button>`s that call it. There are no `<a target=_blank>`. Only in mock mode (preview, no host) does the card fall back to `window.open`.

## Card behaviour

- Handlers `ontoolinput`, `ontoolresult`, `ontoolcancelled` and `onhostcontextchanged` are set before `await app.connect()`. After connect, the host context is applied: theme, style variables, fonts and safe-area insets. `autoResize` is the SDK default, so the height fits the content.
- States: Waiting (skeleton, no spinner, the 90 s note, and the declared agent name from `ontoolinput`); Paid; Standard; Error. All are derived from `structuredContent`. The card never calls tools.
- Paid chip: `Paid & verified` (confirmed/finalized) / `Declined — nothing spent` (policy declined) / `No payment needed` (payment null, no failure) / `Stopped — nothing spent` (payment null with failure). There are two extra cases the spec did not cover: `Payment pending` (info) and `Payment unconfirmed` (warning).
- Progress strip: filled = matching step seen; red = failure event for that step (`payment_declined` → Mandate, `payment_failed`/`outcome_unknown` → x402, `consultation_failed` → Legal, `agent_failed` → that agent); hollow dashed + strikethrough = skipped (`agent_skipped`, `consultation_skipped`, or downstream of a decline); faint = not reached. Replayed results carry `steps: []`. For them the strip is fully filled when `final_card` exists and the payment is confirmed (or there was no payment).
- When `payment` is null on a paid result (Routing did not pick Legal), the Authority/Payment rows become `Routing` + `Next action`.
- Error: `Stopped at <agent label>` (from `failure.failed_agent`; `payment policy` for `payment_declined`), the failure message, and `Nothing was signed or spent` unless payment evidence exists. If it exists, the payment rows are shown instead.
- Light/dark: all structural colours use host tokens. The fallbacks match the documented Claude values, both via `prefers-color-scheme` and `[data-theme]` (what `applyDocumentTheme` sets). `#4F5DF5` is used only for pills, arrows and the progress strip. A lighter accent is used for text in dark mode.

## Checks

- `npm run lint` — clean.
- `npm run build` — success; `/mcp-receipt-preview` prerendered static.
- `npm run test:payments:all` — policy, protocol, workflow passed.
- Local protocol checks against `next start` (no model, no payment):
  - `tools/list`: `submit_request` and `request_legal_consultation` have `_meta = {"ui":{"resourceUri":"ui://pegas/receipt"},"ui/resourceUri":"ui://pegas/receipt"}`; `get_payment_evidence` has no `_meta`. The new `agent_name` description is present on both tools.
  - `resources/list`: one resource `ui://pegas/receipt` with mimeType and `_meta.ui`.
  - `resources/read ui://pegas/receipt`: mimeType `text/html;profile=mcp-app`, `_meta.ui` = `{prefersBorder:true, csp:{resourceDomains:["https://pegas-rouge.vercel.app"]}}`, HTML ≈ 26 KB. The extracted module script passes `node --check`.
  - `GET /mcp-app/ext-apps-app-2.0.3.js`: 200, `application/javascript`, `Access-Control-Allow-Origin: *`.
- Homepage at 360px: `scrollWidth = 360` (no horizontal scroll). "Try it as an AI agent (MCP)" switches to the MCP channel, selects Paid Legal and scrolls to the form; nothing is sent.
- Not called: paid tool, paid web flow, `payments:live-smoke`.

## Screenshots (`mcp-step4-screenshots/`, headless Chrome, not committed)

- `preview-{light,dark}-{360px,720px}.png`: all four mock cards (paid success, standard success, declined, waiting).
- `preview-light-360px-checks-open.png`: the "Show 10 policy checks" row expanded.
- `home-desktop.png`, `home-360.png`, `home-360-connect.png`. `home-360-connect.png` was taken before the last tweak: the URL now wraps instead of being truncated.

## Not verified

- Rendering inside real Claude. This needs a deploy. After the deploy, add the connector in Claude and run `submit_request` (free) to see the card. The paid card was checked only with mocks.

## Deviations

1. **ext-apps is not a dependency; resource and `_meta` are registered manually.** ext-apps 2.0.3 has a required peer dependency on `@modelcontextprotocol/client`, so installing it would pull the client SDK into the server. `registerAppTool`/`registerAppResource` only normalise `_meta` and set the MIME type, and the manual registration gives the same `tools/list` / `resources/read` output (verified above).
2. **The bundle is loaded with a dynamic `await import(BUNDLE)`, not a static `import`.** The URL and the effect are the same. The dynamic import lets the mock fallback (`window.__PEGAS_RECEIPT_MOCK__`) render without the bundle, and if the import fails the card shows a calm message instead of a blank frame. The host handlers are still set before `connect()`.
3. **The preview shows four frames, not three:** a "Waiting" frame was added so the skeleton can be reviewed. There is also a 360/720 width switch next to the light/dark switch. The preview builds the HTML with `origin = ""`, so the logo loads from the local server.
4. **Declined state has no "Show policy checks" row.** The spec reads the controls from `final_card.agentic_payment_evidence`, and `final_card` is null on failure. `structuredContent` was not changed, so AUTH 9/10 is shown only as the summary.
5. **Extra files** beyond the spec: `next.config.ts` (CORS, required), `eslint.config.mjs` (ignore the bundle), `public/mcp-app/ext-apps-LICENSE.txt`, `app/mcp-receipt-preview/ReceiptPreview.tsx` (client part of the preview page).
