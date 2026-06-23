import { Reveal } from "@/components/Reveal";
import { StatCard } from "@/components/admin/StatCard";

interface DashboardMetricsProps {
  campaignsCount: number;
  activeCount: number;
  totalClaims: number;
  avgRate: number | null;
}

export function DashboardMetrics({
  campaignsCount,
  activeCount,
  totalClaims,
  avgRate,
}: DashboardMetricsProps) {
  const rateDisplay = avgRate === null ? "—" : `${avgRate}%`;

  return (
    <>
      {/* Mobile Grid View (md:hidden) */}
      <Reveal.Stagger className="grid grid-cols-2 gap-4 md:hidden">
        <Reveal.Item>
          <StatCard label="Campaigns" value={campaignsCount} />
        </Reveal.Item>
        <Reveal.Item>
          <StatCard label="Active" value={activeCount} />
        </Reveal.Item>
        <Reveal.Item>
          <StatCard label="Total claims" value={totalClaims} />
        </Reveal.Item>
        <Reveal.Item>
          <StatCard label="Avg claim rate" value={rateDisplay} />
        </Reveal.Item>
      </Reveal.Stagger>

      {/* Desktop Unified Card Bar (hidden md:flex) */}
      <Reveal className="hidden md:block">
        <div className="flex w-full items-center justify-between rounded-2xl border border-edge bg-panel py-6 shadow-sm divide-x divide-edge/60">
          {/* Campaigns */}
          <div className="flex-1 px-6 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-edge bg-panel-2 text-mute">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">Campaigns</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">{campaignsCount}</p>
            </div>
          </div>

          {/* Active */}
          <div className="flex-1 px-6 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-edge bg-panel-2 text-mute">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">Active</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">{activeCount}</p>
            </div>
          </div>

          {/* Total Claims */}
          <div className="flex-1 px-6 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-edge bg-panel-2 text-mute">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 11 2 2 4-4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">Total Claims</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">{totalClaims}</p>
            </div>
          </div>

          {/* Avg Claim Rate */}
          <div className="flex-1 px-6 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-edge bg-panel-2 text-mute">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">Avg Claim Rate</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">{rateDisplay}</p>
            </div>
          </div>
        </div>
      </Reveal>
    </>
  );
}
