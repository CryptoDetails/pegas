import { SITE_ORIGIN } from "../site";

// "Pegas receipt": an MCP App (ui:// resource) that MCP Apps hosts such as Claude render as an inline card for the tool result.
// Text-only clients ignore it; the tool's `content` and `structuredContent` are unchanged.
export const RECEIPT_URI = "ui://pegas/receipt";
export const RECEIPT_MIME_TYPE = "text/html;profile=mcp-app";
export const EXT_APPS_VERSION = "2.0.3";
export const RECEIPT_TOOL_META = { ui: { resourceUri: RECEIPT_URI }, "ui/resourceUri": RECEIPT_URI };
export const RECEIPT_RESOURCE_META = { ui: { prefersBorder: true, csp: { resourceDomains: [SITE_ORIGIN] } } };

// The client script is plain JS inside a raw template: it must not contain backticks or "${". __ORIGIN__ and __VERSION__ are substituted below.
const CLIENT_SCRIPT = String.raw`
const ORIGIN = __ORIGIN__;
const BUNDLE = ORIGIN + "/mcp-app/ext-apps-app-__VERSION__.js";
const AGENTS = { intake_agent: "Intake agent", privacy_agent: "Privacy agent", routing_agent: "Routing agent", reviewer_agent: "Reviewer agent", legal_advisor_agent: "Legal Advisor" };
const VERDICTS = { no_policy_issue_identified: "No policy issue identified", human_review_required: "Human review required", needs_information: "Needs more information" };
const OUTCOMES = { routed_demo: ["success", "Routed"], manual_review: ["warning", "Manual review"], needs_information: ["info", "Needs information"], failed: ["danger", "Stopped"] };
const ICONS = {
  check: '<path d="M3.5 8.5l3 3 6-7"/>',
  lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>',
  stop: '<circle cx="8" cy="8" r="5.5"/><path d="M6 6l4 4M10 6l-4 4"/>',
  info: '<circle cx="8" cy="8" r="5.5"/><path d="M8 7.5v3M8 5.3v.2"/>',
  arrow: '<path d="M3 8h9M9 5l3 3-3 3"/>',
  out: '<path d="M6 4h6v6M12 4l-7 7"/>',
  chev: '<path d="M6 4l4 4-4 4"/>',
};
const root = document.getElementById("root");
let app = null;

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "on") el.addEventListener("click", v); else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
function icon(name) {
  const span = h("span", { class: "ico", "aria-hidden": "true" });
  span.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + "</svg>";
  return span;
}
const cap = (v) => (typeof v === "string" && v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ") : null);
const firstSentence = (t) => { if (typeof t !== "string") return null; const m = t.trim().match(/^.*?[.!?](\s|$)/); return (m ? m[0] : t).trim(); };
const agentLabel = (id) => AGENTS[id] || (id ? cap(id) : null);

function header(title, chip) {
  return h("header", { class: "head" },
    h("img", { class: "logo", src: ORIGIN + "/brand/pegas-logo.png", width: 24, height: 24, alt: "" }),
    h("p", { class: "title" }, title),
    chip);
}
function chip(tone, text) {
  const ico = { success: "check", warning: "lock", danger: "stop" }[tone] || "info";
  return h("span", { class: "chip " + tone }, icon(ico), text);
}
function chain(links, caption) {
  const row = h("div", { class: "chain", role: "list", "aria-label": "Delegation chain" });
  links.forEach((l, i) => {
    // The arrow travels with the pill it points to, so a wrapped line never ends on a dangling arrow.
    const pill = h("span", { class: "pill" + (l.external ? " external" : "") }, h("b", {}, l.name), h("small", {}, l.note));
    row.append(h("span", { class: "link", role: "listitem" }, i ? h("span", { class: "link-arrow", "aria-hidden": "true" }, icon("arrow")) : null, pill));
  });
  return h("section", { class: "block" }, row, caption ? h("p", { class: "muted small" }, caption) : null);
}
function strip(defs, steps, assumeDone) {
  const list = h("ol", { class: "strip", style: "--n:" + defs.length, "aria-label": "Progress" });
  for (const d of defs) {
    const has = (fn) => !!fn && steps.some(fn);
    const state = has(d.fail) ? "failed" : has(d.done) || assumeDone ? "done" : has(d.skip) ? "skipped" : "pending";
    list.append(h("li", { class: state, title: d.label + ": " + state }, h("span", { class: "dot" }), h("span", { class: "lbl" }, d.label)));
  }
  return list;
}
function rows(items) {
  const dl = h("dl", { class: "rows" });
  for (const [k, v, cls] of items) if (v) dl.append(h("div", { class: "row" }, h("dt", {}, k), h("dd", { class: cls || null }, v)));
  return dl;
}
function actions(list) {
  const shown = list.filter(Boolean).slice(0, 2);
  if (!shown.length) return null;
  return h("div", { class: "actions" }, shown.map((a, i) =>
    h("button", { type: "button", class: "btn" + (i === 0 && shown.length > 1 ? " primary" : ""), on: () => openLink(a.url) }, a.label, icon("out"))));
}
async function openLink(url) {
  if (app) { try { await app.openLink({ url }); } catch (e) { /* host declined */ } return; }
  window.open(url, "_blank", "noopener"); // preview only: no host to ask
}
const demoAction = () => ({ label: "Open Pegas demo", url: (ORIGIN || location.origin) + "/" });

// ---------- steps ----------
const is = (type, step) => (s) => s.type === type && (!step || s.step_id === step);
const any = (...fns) => (s) => fns.some((f) => f(s));
const PAID_STEPS = [
  { label: "Intake", done: is("agent_completed", "intake"), fail: is("agent_failed", "intake"), skip: is("agent_skipped", "intake") },
  { label: "Routing", done: any(is("agent_completed", "routing"), (s) => s.type === "routing_decision" && s.agent_id), fail: is("agent_failed", "routing"), skip: is("agent_skipped", "routing") },
  { label: "Mandate", done: any(is("mandate_created"), is("mandate_policy_checked")), fail: is("payment_declined"), skip: is("consultation_skipped") },
  { label: "x402", done: any(is("payment_authorized"), is("payment_settling"), is("payment_settled")), fail: any(is("payment_failed"), is("payment_outcome_unknown")), skip: any(is("consultation_skipped"), is("payment_declined")) },
  { label: "On-chain", done: is("payment_confirmed"), skip: any(is("consultation_skipped"), is("payment_declined")) },
  { label: "Legal", done: any(is("consultation_completed"), is("agent_completed", "legal")), fail: any(is("consultation_failed"), is("agent_failed", "legal")), skip: any(is("consultation_skipped"), is("payment_declined")) },
  { label: "Review", done: is("review_completed"), fail: is("agent_failed", "reviewer"), skip: is("agent_skipped", "reviewer") },
];
const STANDARD_STEPS = [
  { label: "Intake", done: is("agent_completed", "intake"), fail: is("agent_failed", "intake"), skip: is("agent_skipped", "intake") },
  { label: "Privacy", done: is("agent_completed", "privacy"), fail: is("agent_failed", "privacy"), skip: is("agent_skipped", "privacy") },
  { label: "Routing", done: is("agent_completed", "routing"), fail: is("agent_failed", "routing"), skip: is("agent_skipped", "routing") },
  { label: "Review", done: is("review_completed"), fail: is("agent_failed", "reviewer"), skip: is("agent_skipped", "reviewer") },
];

// ---------- views ----------
function waiting(args) {
  const name = args && typeof args.agent_name === "string" && args.agent_name.trim() ? args.agent_name.trim().slice(0, 64) : null;
  const sk = (w) => h("span", { class: "sk", style: "width:" + w });
  return h("article", { class: "card", "aria-busy": "true" },
    header("Pegas is working…", null),
    name ? h("p", { class: "muted small" }, "Request from " + name + " · external agent, not verified") : null,
    h("div", { class: "block sk-chain" }, sk("34%"), sk("26%"), sk("28%")),
    h("div", { class: "rows sk-rows" }, ["60%", "72%", "48%", "80%"].map((w) => h("div", { class: "row" }, sk("5.5rem"), sk(w)))),
    h("p", { class: "muted small" }, "Self-hosted model on a scale-to-zero GPU. The first call can take up to 90 seconds."));
}

function callerName(s) { return (s.caller && typeof s.caller.declared_name === "string" && s.caller.declared_name) || "unnamed external agent"; }

function paymentChip(payment, failed) {
  if (!payment) return failed ? chip("danger", "Stopped — nothing spent") : chip("neutral", "No payment needed");
  if (payment.policy_decision === "declined") return chip("warning", "Declined — nothing spent");
  const st = payment.confirmation_status;
  if (st === "confirmed" || st === "finalized") return chip("success", "Paid & verified");
  if (st === "pending") return chip("info", "Payment pending");
  return chip("warning", "Payment unconfirmed");
}

function paymentRows(payment) {
  const auth = payment.auth_total != null ? "AUTH " + payment.auth_passed + "/" + payment.auth_total : null;
  const mandate = payment.mandate_state ? "mandate " + payment.mandate_state : null;
  const st = payment.confirmation_status;
  const pay = payment.policy_decision === "declined" ? "Not signed · declined by policy"
    : [payment.amount, payment.network, st === "pending" ? "confirmation pending" : st || "not settled"].filter(Boolean).join(" · ");
  return [
    ["Authority", [auth, mandate].filter(Boolean).join(" · ") || null],
    ["Payment", pay],
    ["Evidence", payment.evidence_provider === "alchemy" ? "Verified via Alchemy" : null],
  ];
}

function policyChecks(card) {
  const controls = card && card.agentic_payment_evidence && card.agentic_payment_evidence.policy ? card.agentic_payment_evidence.policy.controls : null;
  if (!Array.isArray(controls) || !controls.length) return null;
  const closed = "Show " + controls.length + " policy checks";
  const label = h("span", {}, closed);
  const details = h("details", { class: "checks" },
    h("summary", {}, icon("chev"), label),
    h("ul", {}, controls.map((c) => h("li", { class: c.passed ? "pass" : "fail" },
      icon(c.passed ? "check" : "stop"), h("b", {}, c.id), h("span", {}, c.label || ""), h("em", {}, c.passed ? "pass" : "fail")))));
  details.addEventListener("toggle", () => { label.textContent = details.open ? "Hide policy checks" : closed; });
  return details;
}

function paidView(s, isError) {
  const payment = s.payment || null;
  const card = s.final_card || null;
  const legal = s.legal_consultation || null;
  const steps = Array.isArray(s.steps) ? s.steps : [];
  const confirmed = payment && (payment.confirmation_status === "confirmed" || payment.confirmation_status === "finalized");
  const replayDone = !steps.length && !!card && (!payment || confirmed);
  const failed = isError || !card;
  const kids = [header("Pegas · Legal consultation", paymentChip(payment, failed))];
  if (failed) kids.push(stopped(s, !!payment));
  kids.push(chain([
    { name: callerName(s), note: "external agent, not verified", external: true },
    { name: "Pegas Routing", note: "registered" },
    { name: "Legal Advisor", note: "registered seller" },
  ], "Each step can only narrow authority. Your agent held no keys."));
  kids.push(strip(PAID_STEPS, steps, replayDone));
  const items = payment ? paymentRows(payment) : [["Routing", cap((card && (card.paid_department || card.department)) || null)], ["Next action", card && card.next_action, "clamp"]];
  if (legal && legal.advisory) {
    const verdict = VERDICTS[legal.advisory.verdict] || cap(legal.advisory.verdict);
    const v = h("span", {}, h("b", {}, verdict), " ", firstSentence(legal.advisory.summary) || "");
    items.push(["Legal verdict", v, "clamp3"]);
  } else if (!failed && card && card.clarification_question) items.push(["Question", card.clarification_question, "clamp"]);
  kids.push(rows(items));
  if (payment) kids.push(policyChecks(card));
  if (s.replayed) kids.push(h("p", { class: "muted small" }, "Replayed stored result. No new payment was made."));
  kids.push(actions([payment && payment.explorer_url ? { label: "View transaction", url: payment.explorer_url } : null, demoAction()]));
  return h("article", { class: "card" }, kids);
}

function standardView(s, isError) {
  const card = s.final_card || null;
  const steps = Array.isArray(s.steps) ? s.steps : [];
  const [tone, label] = OUTCOMES[isError || !card ? "failed" : s.outcome] || ["neutral", cap(s.outcome) || "Done"];
  const kids = [header("Pegas · Request routed", chip(tone, label))];
  if (isError || !card) kids.push(stopped(s, false));
  kids.push(chain([{ name: callerName(s), note: "external agent, not verified", external: true }, { name: "Pegas Request Desk", note: "free routing" }], null));
  kids.push(strip(STANDARD_STEPS, steps, !steps.length && !!card));
  if (card) kids.push(rows([
    ["Department", cap(s.department)],
    ["Priority", cap(s.priority)],
    ["Next action", s.next_action || s.clarification_question, "clamp"],
  ]));
  kids.push(h("p", { class: "muted small foot" }, "Free flow · nothing spent"));
  kids.push(actions([demoAction()]));
  return h("article", { class: "card" }, kids);
}

function stopped(s, hasPayment) {
  const f = s.failure || null;
  const where = (f && agentLabel(f.failed_agent)) || (f && f.code === "payment_declined" ? "payment policy" : null);
  const msg = (f && f.message) || (typeof s.error === "string" ? s.error : null) || "The workflow could not complete safely.";
  return h("div", { class: "notice", role: "status" },
    h("b", {}, where ? "Stopped at " + where : "Stopped"),
    h("p", {}, msg),
    hasPayment ? null : h("p", { class: "muted" }, "Nothing was signed or spent."));
}

function genericView(r) {
  const text = Array.isArray(r.content) ? (r.content.find((c) => c && c.type === "text") || {}).text : null;
  const s = r.structuredContent || {};
  const kids = [header("Pegas", r.isError ? chip("danger", "Stopped — nothing spent") : null)];
  kids.push(r.isError ? stopped({ ...s, error: s.error || text }, false) : h("p", {}, text || "Done."));
  kids.push(actions([demoAction()]));
  return h("article", { class: "card" }, kids);
}

function showResult(r) {
  const s = (r && r.structuredContent) || {};
  const view = s.scenario === "paid_legal" ? paidView(s, !!r.isError) : s.scenario === "standard" ? standardView(s, !!r.isError) : genericView(r || {});
  root.replaceChildren(view);
}
function showWaiting(args) { root.replaceChildren(waiting(args)); }

// ---------- host wiring ----------
function applyContext(ctx, lib) {
  if (!ctx) return;
  if (ctx.theme) lib.applyDocumentTheme(ctx.theme);
  if (ctx.styles && ctx.styles.variables) lib.applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles && ctx.styles.css && ctx.styles.css.fonts) lib.applyHostFonts(ctx.styles.css.fonts);
  const inset = ctx.safeAreaInsets;
  if (inset) document.body.style.padding = [inset.top, inset.right, inset.bottom, inset.left].map((v) => "calc(var(--pad) + " + (v || 0) + "px)").join(" ");
}

const mock = window.__PEGAS_RECEIPT_MOCK__;
if (mock) {
  if (mock.result) showResult(mock.result); else showWaiting(mock.input || null);
} else if (window.parent !== window) {
  showWaiting(null);
  try {
    const lib = await import(BUNDLE);
    app = new lib.App({ name: "Pegas receipt", version: "1.0.0" });
    // Handlers are set before connect() so the first tool-input and tool-result notifications are not missed.
    app.ontoolinput = (p) => showWaiting(p && p.arguments);
    app.ontoolresult = (r) => showResult(r);
    app.ontoolcancelled = () => root.replaceChildren(genericView({ isError: true, structuredContent: { error: "The tool call was cancelled. Nothing was signed or spent." } }));
    app.onhostcontextchanged = (ctx) => applyContext(ctx, lib);
    await app.connect();
    applyContext(app.getHostContext(), lib);
  } catch (e) {
    root.replaceChildren(genericView({ isError: true, structuredContent: { error: "The receipt could not connect to the host. The tool result is still in the conversation." } }));
  }
} else {
  root.replaceChildren(genericView({ content: [{ type: "text", text: "This card renders inside an MCP Apps host such as Claude." }] }));
}
`;

const STYLES = String.raw`
:root {
  color-scheme: light dark;
  --color-background-primary: #ffffff; --color-background-secondary: #f5f4ed; --color-background-tertiary: #faf9f5; --color-background-inverse: #141413;
  --color-background-info: #d6e4f6; --color-background-danger: #f7ecec; --color-background-success: #e9f1dc; --color-background-warning: #f6eedf;
  --color-text-primary: #141413; --color-text-secondary: #3d3d3a; --color-text-tertiary: #73726c; --color-text-inverse: #ffffff;
  --color-text-info: #3266ad; --color-text-danger: #7f2c28; --color-text-success: #265b19; --color-text-warning: #5a4815;
  --color-border-primary: rgba(31, 30, 29, 0.4); --color-border-secondary: rgba(31, 30, 29, 0.3); --color-border-tertiary: rgba(31, 30, 29, 0.15);
  --color-border-info: #4682d5; --color-border-danger: #a73d39; --color-border-success: #437426; --color-border-warning: #805c1f;
  --color-ring-primary: rgba(20, 20, 19, 0.7);
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-weight-normal: 400; --font-weight-semibold: 600;
  --font-text-xs-size: 12px; --font-text-sm-size: 14px; --font-text-md-size: 16px; --font-text-sm-line-height: 1.4;
  --border-radius-sm: 6px; --border-radius-md: 8px; --border-radius-lg: 10px; --border-radius-full: 9999px;
  --border-width-regular: 1px;
  --pegas-accent: #4f5df5; --pegas-accent-text: #3d4ad9; --pegas-accent-soft: rgba(79, 93, 245, 0.1);
  --pad: 16px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-background-primary: #30302e; --color-background-secondary: #262624; --color-background-tertiary: #141413; --color-background-inverse: #faf9f5;
    --color-background-info: #253e5f; --color-background-danger: #602a28; --color-background-success: #1b4614; --color-background-warning: #483a0f;
    --color-text-primary: #faf9f5; --color-text-secondary: #c2c0b6; --color-text-tertiary: #9c9a92; --color-text-inverse: #141413;
    --color-text-info: #80aadd; --color-text-danger: #ee8884; --color-text-success: #7ab948; --color-text-warning: #d1a041;
    --color-border-primary: rgba(222, 220, 209, 0.4); --color-border-secondary: rgba(222, 220, 209, 0.3); --color-border-tertiary: rgba(222, 220, 209, 0.15);
    --color-border-danger: #cd5c58; --color-border-success: #599130; --color-border-warning: #a87829; --color-ring-primary: rgba(250, 249, 245, 0.7);
    --pegas-accent-text: #9aa3ff; --pegas-accent-soft: rgba(124, 136, 255, 0.16);
  }
}
:root[data-theme="dark"] {
  --color-background-primary: #30302e; --color-background-secondary: #262624; --color-background-tertiary: #141413; --color-background-inverse: #faf9f5;
  --color-background-info: #253e5f; --color-background-danger: #602a28; --color-background-success: #1b4614; --color-background-warning: #483a0f;
  --color-text-primary: #faf9f5; --color-text-secondary: #c2c0b6; --color-text-tertiary: #9c9a92; --color-text-inverse: #141413;
  --color-text-info: #80aadd; --color-text-danger: #ee8884; --color-text-success: #7ab948; --color-text-warning: #d1a041;
  --color-border-primary: rgba(222, 220, 209, 0.4); --color-border-secondary: rgba(222, 220, 209, 0.3); --color-border-tertiary: rgba(222, 220, 209, 0.15);
  --color-border-danger: #cd5c58; --color-border-success: #599130; --color-border-warning: #a87829; --color-ring-primary: rgba(250, 249, 245, 0.7);
  --pegas-accent-text: #9aa3ff; --pegas-accent-soft: rgba(124, 136, 255, 0.16);
}
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  padding: var(--pad); background: var(--color-background-primary); color: var(--color-text-primary);
  font-family: var(--font-sans); font-size: var(--font-text-sm-size); line-height: var(--font-text-sm-line-height);
  -webkit-font-smoothing: antialiased;
}
p { margin: 0; }
.card { display: grid; gap: 14px; min-width: 0; }
.head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.logo { width: 24px; height: 24px; border-radius: var(--border-radius-sm); object-fit: contain; }
.title { flex: 1 1 auto; font-weight: var(--font-weight-semibold); font-size: var(--font-text-md-size); min-width: 0; }
.chip {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px 3px 8px; border-radius: var(--border-radius-full);
  font-size: var(--font-text-xs-size); font-weight: var(--font-weight-semibold); white-space: nowrap;
  border: var(--border-width-regular) solid var(--color-border-tertiary); background: var(--color-background-secondary); color: var(--color-text-secondary);
}
.chip.success { background: var(--color-background-success); color: var(--color-text-success); border-color: var(--color-border-success); }
.chip.warning { background: var(--color-background-warning); color: var(--color-text-warning); border-color: var(--color-border-warning); }
.chip.danger { background: var(--color-background-danger); color: var(--color-text-danger); border-color: var(--color-border-danger); }
.chip.info { background: var(--color-background-info); color: var(--color-text-info); border-color: var(--color-border-info); }
.ico { display: inline-flex; flex: none; }
.ico svg { width: 14px; height: 14px; }
.muted { color: var(--color-text-tertiary); }
.small { font-size: var(--font-text-xs-size); }
.block { display: grid; gap: 8px; }
.chain { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.pill {
  display: inline-flex; flex-direction: column; padding: 6px 12px; border-radius: var(--border-radius-lg); min-width: 0;
  border: 1px solid var(--pegas-accent); background: var(--pegas-accent-soft);
}
.pill b { font-weight: var(--font-weight-semibold); font-size: var(--font-text-sm-size); overflow-wrap: anywhere; }
.pill small { font-size: 11px; color: var(--color-text-tertiary); }
.pill.external { border: 1px dashed var(--color-border-primary); background: transparent; }
.link { display: inline-flex; align-items: center; gap: 6px; min-width: 0; max-width: 100%; }
.link-arrow { color: var(--pegas-accent-text); }
.strip { list-style: none; margin: 0; padding: 2px 0 0; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); }
.strip li { position: relative; display: grid; justify-items: center; gap: 5px; text-align: center; min-width: 0; }
.strip li + li::before {
  content: ""; position: absolute; top: 4.5px; right: 50%; width: 100%; height: 1.5px; background: var(--color-border-tertiary);
}
.strip li.done + li.done::before, .strip li.done + li.failed::before { background: var(--pegas-accent); }
.dot { position: relative; z-index: 1; width: 10px; height: 10px; border-radius: 50%; background: var(--color-background-primary); border: 1.5px solid var(--color-border-secondary); }
.strip li.done .dot { background: var(--pegas-accent); border-color: var(--pegas-accent); }
.strip li.skipped .dot { border-style: dashed; border-color: var(--color-border-primary); }
.strip li.failed .dot { background: var(--color-text-danger); border-color: var(--color-text-danger); }
.lbl { font-size: 11px; line-height: 1.2; color: var(--color-text-tertiary); overflow-wrap: anywhere; }
.strip li.done .lbl { color: var(--color-text-secondary); }
.strip li.skipped .lbl { text-decoration: line-through; text-decoration-color: var(--color-border-secondary); }
.strip li.failed .lbl { color: var(--color-text-danger); font-weight: var(--font-weight-semibold); }
.rows { margin: 0; display: grid; }
.row { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr); gap: 4px 12px; padding: 10px 0; border-top: var(--border-width-regular) solid var(--color-border-tertiary); }
.row:last-child { border-bottom: var(--border-width-regular) solid var(--color-border-tertiary); }
dt { color: var(--color-text-tertiary); }
dd { margin: 0; color: var(--color-text-primary); overflow-wrap: anywhere; }
dd b { font-weight: var(--font-weight-semibold); }
.clamp, .clamp3 { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.clamp3 { -webkit-line-clamp: 3; }
.checks { border-bottom: var(--border-width-regular) solid var(--color-border-tertiary); margin-top: -14px; }
.checks summary {
  display: flex; align-items: center; gap: 6px; min-height: 44px; cursor: pointer; list-style: none;
  color: var(--color-text-secondary); font-weight: var(--font-weight-semibold);
}
.checks summary::-webkit-details-marker { display: none; }
.checks summary .ico { transition: transform .15s ease; }
.checks[open] summary .ico { transform: rotate(90deg); }
.checks ul { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 6px; }
.checks li { display: grid; grid-template-columns: 16px 4.2rem minmax(0, 1fr) auto; align-items: start; gap: 8px; font-size: var(--font-text-xs-size); }
.checks li b { font-family: var(--font-mono); font-weight: var(--font-weight-normal); color: var(--color-text-secondary); }
.checks li em { font-style: normal; color: var(--color-text-success); }
.checks li .ico { color: var(--color-text-success); padding-top: 1px; }
.checks li.fail em, .checks li.fail .ico { color: var(--color-text-danger); }
.notice { display: grid; gap: 4px; padding: 12px 14px; border-radius: var(--border-radius-lg); background: var(--color-background-secondary); border-left: 3px solid var(--color-border-danger); }
.foot { margin-top: -4px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.btn {
  flex: 1 1 auto; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 14px;
  font: inherit; font-weight: var(--font-weight-semibold); cursor: pointer;
  border-radius: var(--border-radius-md); border: 1px solid var(--color-border-secondary); background: transparent; color: var(--color-text-primary);
}
.btn.primary { background: var(--color-background-inverse); color: var(--color-text-inverse); border-color: transparent; }
.btn:hover { border-color: var(--color-border-primary); }
.btn:focus-visible, .checks summary:focus-visible { outline: 2px solid var(--color-ring-primary); outline-offset: 2px; }
.sk { display: block; height: 12px; border-radius: var(--border-radius-full); background: var(--color-border-tertiary); animation: pulse 1.4s ease-in-out infinite; }
.sk-chain { display: flex; gap: 8px; }
.sk-chain .sk { height: 36px; border-radius: var(--border-radius-lg); }
.sk-rows .row { align-items: center; }
@keyframes pulse { 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
@media (max-width: 360px) {
  .row { grid-template-columns: minmax(0, 1fr); }
  .lbl { font-size: 10px; }
}
`;

// `origin` is where the card loads the App bundle and logo from. The preview page passes "" so the iframe uses the local server.
export function buildReceiptHtml(origin: string = SITE_ORIGIN, mock?: unknown) {
  const script = CLIENT_SCRIPT.replace("__ORIGIN__", JSON.stringify(origin)).replace("__VERSION__", EXT_APPS_VERSION);
  const mockScript = mock === undefined ? "" : `<script>window.__PEGAS_RECEIPT_MOCK__ = ${JSON.stringify(mock).replace(/</g, "\\u003c")};</script>\n`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">
<title>Pegas receipt</title>
<style>${STYLES}</style>
${mockScript}</head>
<body><main id="root" aria-live="polite"></main>
<script type="module">${script}</script>
</body></html>`;
}

export const RECEIPT_HTML = buildReceiptHtml();
