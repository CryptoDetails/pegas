const MAPPINGS = [
  ["Principal ↔ agent identity", "KYA-lite Agent Registry"],
  ["Recorded delegated authority", "Agent Mandate"],
  ["Granular transaction limits", "Fixed network, asset, payee, amount + deterministic AUTH controls"],
  ["Authority cannot expand through an agent chain", "Effective authority is the intersection of global policy, mandate, identity, seller quote and budget controls"],
  ["Revocation / suspension", "Payment kill switch + mandate lifecycle"],
  ["Transaction receipts / auditability", "Agentic Payment Evidence"],
  ["Reconstructable activity", "Mandate → policy → identity → x402 → settlement → chain evidence → specialist result"],
] as const;

export function FrameworkToPrototype() {
  return (
    <section className="border-t border-slate-200 py-14 sm:py-18">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">Framework → prototype</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">From framework → working prototype</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Lead frames the harder questions around identity, delegated authority, transaction constraints, revocation and auditability. Pegas takes a subset of those ideas and makes them concrete in a working software prototype.
        </p>
      </div>

      <div className="mt-9 border-t border-slate-200">
        <div className="hidden grid-cols-[minmax(0,0.9fr)_56px_minmax(0,1.1fr)] gap-5 border-b border-slate-200 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:grid">
          <span>Lead</span><span /><span>Pegas</span>
        </div>
        {MAPPINGS.map(([lead, pegas]) => (
          <div key={lead} className="grid gap-2 border-b border-slate-200 py-5 sm:grid-cols-[minmax(0,0.9fr)_56px_minmax(0,1.1fr)] sm:items-center sm:gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:hidden">Lead</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-800 sm:mt-0">{lead}</p>
            </div>
            <div className="hidden text-center text-lg text-indigo-300 sm:block">→</div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-400 sm:hidden">Pegas</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-900 sm:mt-0">{pegas}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 max-w-4xl text-xs leading-5 text-slate-500">
        KYA-lite is a demo identity registry. The prototype explores selected governance concepts rather than claiming to implement a complete regulatory framework.
      </p>
    </section>
  );
}
