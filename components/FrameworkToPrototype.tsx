const MAPPINGS = [
  ["Principal ↔ agent identity", "KYA-lite Agent Registry"],
  ["Recorded delegated authority", "Agent Mandate"],
  ["Granular transaction limits", "Fixed asset, network, payee and amount + AUTH controls"],
  ["Authority cannot expand through an agent chain", "Intersection of global policy, mandate, identity, seller quote and budget controls"],
  ["Revocation / suspension", "Production payment kill switch + mandate lifecycle"],
  ["Transaction receipts / auditability", "Agentic Payment Evidence"],
  ["Reconstructable activity", "Mandate → policy → identity → x402 → settlement → chain evidence → Legal result"],
] as const;

export function FrameworkToPrototype() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow sm:p-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500">Lead inspiration</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">From framework → working prototype</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Lead&apos;s broader framework asks who is acting, on whose authority, within what limits, against which counterparties, with what revocation path and with what audit trail. Pegas translates several of those questions into a bounded technical prototype, not the full regulatory framework.
        </p>
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {MAPPINGS.map(([lead, pegas]) => (
          <div key={lead} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[minmax(0,0.9fr)_28px_minmax(0,1.1fr)] sm:items-center">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Lead concept</p><p className="mt-1 text-sm font-semibold text-slate-800">{lead}</p></div>
            <div className="hidden text-center text-slate-300 sm:block">→</div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-400">Pegas</p><p className="mt-1 text-sm font-semibold text-slate-800">{pegas}</p></div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">
        KYA-lite is a demo identity registry, not formal KYA. Pegas does not claim regulatory compliance, Lead affiliation, endorsement or implementation of Lead&apos;s entire framework.
      </p>
    </section>
  );
}
