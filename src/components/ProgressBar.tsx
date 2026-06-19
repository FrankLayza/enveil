/**
 * Violet claim-progress bar. `indeterminate` mode (no known denominator) shows a
 * neutral pulsing segment instead of a misleading 0%.
 */
export function ProgressBar({
  value,
  max,
  indeterminate,
}: {
  value: number;
  max?: number;
  indeterminate?: boolean;
}) {
  const pct =
    !indeterminate && max && max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-violet-tint">
      {indeterminate ? (
        <div className="h-full w-1/3 rounded-full bg-violet/40 animate-pulse" />
      ) : (
        <div
          className="h-full rounded-full bg-violet transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
