"use client";

import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";
type Width = 360 | 720;
type PreviewCase = { id: string; label: string; html: string };

// A subset of the host style variables Claude sends, per the MCP Apps design guidelines.
const HOST_VARS: Record<Theme, Record<string, string>> = {
  light: {
    "--color-background-primary": "#FFFFFF", "--color-background-secondary": "#F5F4ED", "--color-background-inverse": "#141413",
    "--color-background-success": "#E9F1DC", "--color-background-warning": "#F6EEDF", "--color-background-danger": "#F7ECEC", "--color-background-info": "#D6E4F6",
    "--color-text-primary": "#141413", "--color-text-secondary": "#3D3D3A", "--color-text-tertiary": "#73726C", "--color-text-inverse": "#FFFFFF",
    "--color-text-success": "#265B19", "--color-text-warning": "#5A4815", "--color-text-danger": "#7F2C28", "--color-text-info": "#3266AD",
    "--color-border-primary": "rgba(31,30,29,0.4)", "--color-border-secondary": "rgba(31,30,29,0.3)", "--color-border-tertiary": "rgba(31,30,29,0.15)",
    "--color-border-success": "#437426", "--color-border-warning": "#805C1F", "--color-border-danger": "#A73D39", "--color-border-info": "#4682D5",
    "--color-ring-primary": "rgba(20,20,19,0.7)", "--pegas-accent-text": "#3d4ad9", "--pegas-accent-soft": "rgba(79,93,245,0.1)",
  },
  dark: {
    "--color-background-primary": "#30302E", "--color-background-secondary": "#262624", "--color-background-inverse": "#FAF9F5",
    "--color-background-success": "#1B4614", "--color-background-warning": "#483A0F", "--color-background-danger": "#602A28", "--color-background-info": "#253E5F",
    "--color-text-primary": "#FAF9F5", "--color-text-secondary": "#C2C0B6", "--color-text-tertiary": "#9C9A92", "--color-text-inverse": "#141413",
    "--color-text-success": "#7AB948", "--color-text-warning": "#D1A041", "--color-text-danger": "#EE8884", "--color-text-info": "#80AADD",
    "--color-border-primary": "rgba(222,220,209,0.4)", "--color-border-secondary": "rgba(222,220,209,0.3)", "--color-border-tertiary": "rgba(222,220,209,0.15)",
    "--color-border-success": "#599130", "--color-border-warning": "#A87829", "--color-border-danger": "#CD5C58", "--color-border-info": "#4682D5",
    "--color-ring-primary": "rgba(250,249,245,0.7)", "--pegas-accent-text": "#9aa3ff", "--pegas-accent-soft": "rgba(124,136,255,0.16)",
  },
};

export function ReceiptPreview({ cases }: { cases: PreviewCase[] }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [width, setWidth] = useState<Width>(360);
  const dark = theme === "dark";

  return (
    <main className={`min-h-screen px-4 py-8 sm:px-8 ${dark ? "bg-[#1f1e1d] text-[#FAF9F5]" : "bg-[#FAF9F5] text-slate-900"}`}>
      <div className="mx-auto max-w-[1600px]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-60">Review only · not linked</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Pegas receipt · MCP App preview</h1>
        <p className="mt-2 max-w-3xl text-sm opacity-70">
          The same <code>ui://pegas/receipt</code> HTML that Claude renders, fed with mock tool results through <code>window.__PEGAS_RECEIPT_MOCK__</code>. The switch sets host style variables on each iframe body.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Segmented value={theme} options={["light", "dark"]} onChange={setTheme} dark={dark} />
          <Segmented value={width} options={[360, 720]} format={(v) => `${v}px`} onChange={setWidth} dark={dark} />
        </div>
        <div className="mt-8 flex flex-wrap items-start gap-8">
          {cases.map((c) => (
            <figure key={c.id} className="m-0 min-w-0" style={{ width, maxWidth: "100%" }}>
              <figcaption className="mb-2 text-xs font-semibold opacity-70">{c.label}</figcaption>
              <div className={`overflow-hidden rounded-xl border ${dark ? "border-[rgba(222,220,209,0.15)]" : "border-[rgba(31,30,29,0.15)]"}`}>
                <ReceiptFrame html={c.html} theme={theme} title={c.label} />
              </div>
            </figure>
          ))}
        </div>
      </div>
    </main>
  );
}

function ReceiptFrame({ html, theme, title }: { html: string; theme: Theme; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(240);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | null = null;
    const setup = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      doc.documentElement.style.colorScheme = theme;
      for (const [key, value] of Object.entries(HOST_VARS[theme])) doc.body.style.setProperty(key, value);
      observer?.disconnect();
      observer = new ResizeObserver(() => setHeight(Math.ceil(doc.body.getBoundingClientRect().height)));
      observer.observe(doc.body);
    };
    setup();
    frame.addEventListener("load", setup);
    return () => { frame.removeEventListener("load", setup); observer?.disconnect(); };
  }, [theme]);

  return <iframe ref={ref} srcDoc={html} title={title} className="block w-full border-0" style={{ height }} />;
}

function Segmented<T extends string | number>({ value, options, onChange, format, dark }: { value: T; options: T[]; onChange: (v: T) => void; format?: (v: T) => string; dark: boolean }) {
  return (
    <div className={`inline-flex rounded-xl p-1 ${dark ? "bg-white/10" : "bg-black/5"}`}>
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={option === value}
          className={`min-h-9 rounded-lg px-3 text-xs font-bold capitalize transition ${option === value ? (dark ? "bg-white/20" : "bg-white shadow-sm") : "opacity-60"}`}
        >
          {format ? format(option) : String(option)}
        </button>
      ))}
    </div>
  );
}
