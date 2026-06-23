import { useMemo } from "react";
import type { Recipient } from "@/lib/recipients";
import { formatTokens } from "@/lib/recipients";
import {
  type VestingSchedule,
  MIN_TRANCHES,
  MAX_TRANCHES,
  GAS_PER_TRANCHE_ETH,
  clampTrancheCount,
  computeTranches,
  buildRecipientPlans,
  tranchePoolTotalsRaw,
  planGrandTotalRaw,
  formatUnlockDate,
} from "@/lib/vesting";

type SchedulePartial = Omit<VestingSchedule, "startTs">;

const INTERVAL_PRESETS = [
  { label: "Weekly", days: 7 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
];

const CLIFF_PRESETS = [
  { label: "None", days: 0 },
  { label: "1 mo", days: 30 },
  { label: "3 mo", days: 90 },
  { label: "6 mo", days: 180 },
];

/**
 * ScheduleBuilder — vesting-only Step 1 sub-panel. Lets the admin shape the
 * unlock schedule (slice count, interval, cliff) and shows a live preview of
 * the dated tranches, per-tranche pool totals, and the on-chain cost (one deploy
 * per tranche).
 */
export function ScheduleBuilder({
  schedule,
  onChange,
  recipients,
  startTs,
}: {
  schedule: SchedulePartial;
  onChange: (s: SchedulePartial) => void;
  recipients: Recipient[];
  startTs: number;
}) {
  const count = clampTrancheCount(schedule.trancheCount);

  const { tranches, poolTotals, grandTotal } = useMemo(() => {
    const full: VestingSchedule = { ...schedule, trancheCount: count, startTs };
    const plans = buildRecipientPlans(recipients, count);
    return {
      tranches: computeTranches(full),
      poolTotals: tranchePoolTotalsRaw(plans, count),
      grandTotal: planGrandTotalRaw(plans),
    };
  }, [schedule, count, startTs, recipients]);

  const setCount = (n: number) => onChange({ ...schedule, trancheCount: clampTrancheCount(n) });
  const setInterval = (d: number) => onChange({ ...schedule, intervalDays: Math.max(1, d) });
  const setCliff = (d: number) => onChange({ ...schedule, cliffDays: Math.max(0, d) });

  const gasEstimate = (count * GAS_PER_TRANCHE_ETH).toFixed(2);

  return (
    <div className="rounded-2xl border border-(--card-accent)/30 bg-(--card-accent-tint)/30 p-4 sm:p-5 space-y-5">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
        </span>
        <div>
          <h3 className="text-sm font-semibold text-ink">Unlock schedule</h3>
          <p className="text-xs text-mute">
            Each recipient's total is split evenly across these private, dated unlocks.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Tranche count */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-faint mb-1.5">
            Unlocks
          </label>
          <div className="flex items-center gap-2">
            <Stepper
              value={count}
              min={MIN_TRANCHES}
              max={MAX_TRANCHES}
              onChange={setCount}
            />
          </div>
        </div>

        {/* Interval */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-faint mb-1.5">
            Every
          </label>
          <div className="flex flex-wrap gap-1.5">
            {INTERVAL_PRESETS.map((p) => (
              <Chip
                key={p.days}
                active={schedule.intervalDays === p.days}
                onClick={() => setInterval(p.days)}
              >
                {p.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Cliff */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-faint mb-1.5">
            Cliff
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CLIFF_PRESETS.map((p) => (
              <Chip
                key={p.days}
                active={schedule.cliffDays === p.days}
                onClick={() => setCliff(p.days)}
              >
                {p.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline preview */}
      <div className="rounded-xl border border-edge bg-panel/80 overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Preview · {count} unlocks
          </span>
          {grandTotal > 0n && (
            <span className="font-mono text-xs font-semibold" style={{ color: "var(--card-accent)" }}>
              {formatTokens(grandTotal)} total
            </span>
          )}
        </div>
        <ol className="divide-y divide-edge/60">
          {tranches.map((t, i) => (
            <li key={t.index} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                style={{ backgroundColor: "var(--card-accent-tint)", color: "var(--card-accent)" }}
              >
                {t.index + 1}
              </span>
              <span className="flex-1 text-sm text-ink">{formatUnlockDate(t.unlockTs)}</span>
              {i === 0 && t.unlockTs <= Math.floor(Date.now() / 1000) + 300 && (
                <span className="rounded-full bg-(--card-accent)/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--card-accent)" }}>
                  At start
                </span>
              )}
              <span className="font-mono text-sm font-semibold text-ink">
                {poolTotals[i] !== undefined ? formatTokens(poolTotals[i]) : "—"}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Cost note */}
      <div className="flex items-start gap-2 text-xs text-mute">
        <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <span>
          Each unlock is its own confidential deploy — about{" "}
          <span className="font-mono font-semibold text-ink">~{gasEstimate} ETH</span> gas total for{" "}
          {count} unlocks. Amounts stay encrypted the whole way.
        </span>
      </div>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-edge bg-panel text-ink transition-colors hover:bg-panel-2 disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} className={btn} aria-label="Fewer unlocks">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
      </button>
      <span className="w-8 text-center font-mono text-lg font-bold text-ink">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} className={btn} aria-label="More unlocks">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all " +
        (active
          ? "border-(--card-accent) text-(--card-accent-ink)"
          : "border-edge bg-panel text-mute hover:border-(--card-accent)/50 hover:text-ink")
      }
      style={active ? { backgroundColor: "var(--card-accent)" } : undefined}
    >
      {children}
    </button>
  );
}
