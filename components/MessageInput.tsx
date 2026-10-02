"use client";

type Preset = {
  label: string;
  message: string;
};

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  loading: boolean;
  validationError: string | null;
};

const presets: Preset[] = [
  {
    label: "Integration",
    message:
      "Hi, we are building a wallet and would like to integrate your swap API. Could your team share technical requirements and documentation?",
  },
  {
    label: "Support",
    message:
      "My swap shows completed but the funds have not arrived in my receiving wallet. Can you check what happened?",
  },
  {
    label: "Partnership",
    message:
      "We operate a crypto wallet and would like to discuss a possible long-term partnership with your team.",
  },
  {
    label: "Media",
    message:
      "I am writing an article about self-custody wallets and would like a short comment from your team before tomorrow.",
  },
];

export function MessageInput({ value, onChange, onAnalyze, loading, validationError }: MessageInputProps) {
  return (
    <section className="card-shadow rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Try the model</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Send one message through the stack</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">The triage task is just the workload. The real demo is the inference path behind it.</p>
        </div>
        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
          English input
        </span>
      </div>

      <label htmlFor="message" className="sr-only">Message to send to the model</label>
      <textarea
        id="message"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste a business message here..."
        className={`focus-ring mt-6 min-h-52 w-full resize-y rounded-2xl border bg-slate-50 px-4 py-4 text-[15px] leading-7 text-slate-900 placeholder:text-slate-400 ${validationError ? "border-red-300" : "border-slate-200"}`}
        aria-invalid={Boolean(validationError)}
        aria-describedby={validationError ? "message-error" : undefined}
      />

      {validationError ? <p id="message-error" className="mt-2 text-sm font-medium text-red-700">{validationError}</p> : null}

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Or use an example</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.message)}
              className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Pegas sends this request through its server-side route. If the GPU is stopped, you will see an offline state instead of a fake result.
        </p>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading}
          className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:min-w-40"
        >
          {loading ? "Running..." : "Run on my model"}
        </button>
      </div>
    </section>
  );
}
