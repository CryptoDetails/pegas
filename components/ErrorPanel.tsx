import type { UiError } from "@/lib/types";

export function ErrorPanel({ error }: { error: UiError }) {
  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-7" role="alert">
      <div className="flex gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-lg font-bold text-red-600 shadow-sm" aria-hidden="true">
          !
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">{error.code}</p>
          <h2 className="mt-1 text-lg font-semibold text-red-950">{error.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-red-800">{error.message}</p>
        </div>
      </div>
    </section>
  );
}
