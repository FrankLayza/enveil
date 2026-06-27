import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { Reveal } from "@/components/Reveal";
import { ConnectButton } from "@/components/ConnectButton";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";
import { CampaignCard } from "@/components/admin/CampaignCard";
import { useMyCampaigns, useCampaignClaimCounts } from "@/lib/useCampaignAnalytics";

function NewCampaignButton({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/admin/new"
      className={
        "inline-flex items-center gap-2 rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet/25 transition-all duration-150 hover:-translate-y-0.5 hover:bg-violet-hover " +
        className
      }
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      New campaign
    </Link>
  );
}

function CampaignCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-edge bg-panel h-full">
      {/* Image area */}
      <div className="h-32 w-full bg-panel-2/80 relative" />
      
      {/* Title & Address */}
      <div className="px-5 pt-4 space-y-2">
        <div className="h-5 w-3/4 rounded bg-violet-tint/40" />
        <div className="h-3 w-1/3 rounded bg-violet-tint/30" />
      </div>

      {/* Middle split section */}
      <div className="mt-4 px-5 py-4 border-y border-edge/40 bg-panel-2/40 flex items-center divide-x divide-edge/60 gap-4">
        <div className="flex-1 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-violet-tint/30 shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-2 w-8 rounded bg-violet-tint/30" />
            <div className="h-3.5 w-12 rounded bg-violet-tint/40" />
          </div>
        </div>
        <div className="flex-1 flex items-center gap-3 pl-4">
          <div className="h-8 w-8 rounded-full bg-violet-tint/30 shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-2 w-16 rounded bg-violet-tint/30" />
            <div className="h-3.5 w-10 rounded bg-violet-tint/40" />
          </div>
        </div>
      </div>

      {/* Badges & Action */}
      <div className="px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          <div className="h-5 w-24 rounded bg-violet-tint/30" />
          <div className="h-5 w-12 rounded bg-violet-tint/30" />
        </div>
        <div className="h-8 w-8 rounded-full bg-violet-tint/30 shrink-0" />
      </div>

      {/* Footer */}
      <div className="mt-auto px-5 pb-4 flex items-center justify-between border-t border-edge/20 pt-3">
        <div className="h-3 w-32 rounded bg-violet-tint/30" />
        <div className="h-4 w-4 rounded-full bg-violet-tint/30" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { address, isConnected } = useAccount();
  const { data: campaigns, isLoading, isError, isFetching, refetch } = useMyCampaigns(address);
  const list = campaigns ?? [];
  const { byAddress, totalClaims } = useCampaignClaimCounts(list);

  const activeCount = list.filter((c) => c.status === "active").length;

  
  const rated = list.filter(
    (c) =>
      c.totalRecipients &&
      c.totalRecipients > 0 &&
      typeof byAddress[c.address.toLowerCase()] === "number",
  );
  const avgRate = rated.length
    ? Math.round(
        (rated.reduce(
          (s, c) => s + byAddress[c.address.toLowerCase()]! / c.totalRecipients!,
          0,
        ) /
          rated.length) *
          100,
      )
    : null;

  return (
    <div>
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Campaigns</h1>
          <p className="mt-1 text-sm text-mute">
            Create, track, and watch claim progress — counts only, never amounts.
          </p>
        </div>
        {isConnected && <NewCampaignButton />}
      </header>

      {!isConnected ? (
        <div className="rounded-2xl border border-violet-edge bg-violet-tint/40 px-6 py-14 text-center">
          <h2 className="font-display text-lg font-semibold text-ink">Connect your wallet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-mute">
            Connect the admin wallet to view the campaigns you've created and their live claim progress.
          </p>
          <div className="mt-5 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : isLoading ? (
        /* Loading skeletons */
        <div className="space-y-8">
          {/* Mobile Loading Skeleton */}
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-violet-edge/40 bg-panel p-5">
                <div className="h-3 w-16 animate-pulse rounded bg-violet-tint/70" />
                <div className="mt-4 h-8 w-12 animate-pulse rounded bg-violet-tint/70" />
              </div>
            ))}
          </div>
          {/* Desktop Loading Skeleton */}
          <div className="hidden md:flex w-full items-center justify-between rounded-2xl border border-edge bg-panel py-6 shadow-sm divide-x divide-edge/60 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-1 px-6 flex items-center gap-4">
                <div className="h-11 w-11 shrink-0 rounded-full bg-violet-tint/40" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-16 rounded bg-violet-tint/50" />
                  <div className="h-6 w-12 rounded bg-violet-tint/50" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CampaignCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold text-danger">
            Couldn't load campaigns from the network.
          </p>
          <p className="mt-1 max-w-md text-sm text-danger/80">
            The RPC endpoint rejected the request — usually a rate limit on a public
            node. Wait a moment and retry, or switch to a dedicated RPC. You can still
            create a campaign in the meantime.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isFetching ? "animate-spin" : ""}
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
              </svg>
              {isFetching ? "Retrying…" : "Try again"}
            </button>
            <Link
              to="/admin/new"
              className="inline-flex items-center gap-2 rounded-full border border-violet-edge bg-panel px-4 py-2 text-xs font-semibold text-violet-deep transition-all duration-150 hover:-translate-y-0.5 hover:bg-violet-tint/50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New campaign
            </Link>
          </div>
        </div>
      ) : list.length === 0 ? (
        
        <div className="rounded-2xl border border-edge bg-panel px-6 py-16 text-center">
          <h2 className="font-display text-lg font-semibold text-ink">No campaigns yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-mute">
            Create your first private payroll — set recipients, fund the pool, and share claim links.
          </p>
          <div className="mt-6 flex justify-center">
            <NewCampaignButton />
          </div>
        </div>
      ) : (
        
        <div className="space-y-8">
          <DashboardMetrics
            campaignsCount={list.length}
            activeCount={activeCount}
            totalClaims={totalClaims}
            avgRate={avgRate}
          />

          <Reveal.Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Background refetch in progress (e.g. just created a campaign) —
                lead with a skeleton so the incoming campaign has a placeholder. */}
            {isFetching && (
              <div className="animate-pulse">
                <CampaignCardSkeleton />
              </div>
            )}
            {list.map((c) => (
              <Reveal.Item key={c.address}>
                <CampaignCard campaign={c} claimed={byAddress[c.address.toLowerCase()]} />
              </Reveal.Item>
            ))}
          </Reveal.Stagger>
        </div>
      )}
    </div>
  );
}
