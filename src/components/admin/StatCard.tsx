import type { ReactNode } from "react";

/** Dashboard summary stat — label, big value, optional hint. */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-edge bg-panel p-5 transition-colors duration-150 hover:border-edge-strong">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  );
}
