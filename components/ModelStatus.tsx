type ModelStatusProps = {
  status: "checking" | "online" | "offline";
  compact?: boolean;
};

const styles = {
  checking: "border-slate-200 bg-slate-50 text-slate-600",
  online: "border-green-200 bg-green-50 text-green-700",
  offline: "border-amber-200 bg-amber-50 text-amber-800",
};

const dots = {
  checking: "bg-slate-400",
  online: "bg-green-500",
  offline: "bg-amber-500",
};

export function ModelStatus({ status, compact = false }: ModelStatusProps) {
  const label = status === "checking" ? "Checking model" : status === "online" ? "Model online" : "Model offline";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${styles[status]}`}
      aria-label={label}
    >
      <span className={`h-2 w-2 rounded-full ${dots[status]}`} aria-hidden="true" />
      <span>{label}</span>
      {!compact && status === "offline" ? <span className="font-normal text-amber-700">GPU not connected yet</span> : null}
    </div>
  );
}
