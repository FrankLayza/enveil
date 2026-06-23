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

export function Dashboard() {
  const { address, isConnected } = useAccount();
  const { data: campaigns, isLoading, isError, isFetching, refetch } = useMyCampaigns(address);
  const list = campaigns ?? [];
  const { byAddress, totalClaims } = useCampaignClaimCounts(list);

  const activeCount = list.filter((c) => c.status === "active").length;

  // Average claim rate over campaigns with a known denominator + loaded count.
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
      {/* Header */}
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Campaigns</h1>
          <p className="mt-1 text-sm text-mute">
            Create, track, and watch claim progress — counts only, never amounts.
          </p>
        </div>
        {isConnected && <NewCampaignButton />}
      </header>

      {/* Not connected */}
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
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-violet-edge/40 bg-panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-1/3 space-y-2">
                    <div className="h-5 w-full animate-pulse rounded bg-violet-tint/70" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-violet-tint/70" />
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded-full bg-violet-tint/70" />
                </div>
                <div className="mt-6 space-y-2.5">
                  <div className="h-2 w-full animate-pulse rounded-full bg-violet-tint/70" />
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-1/4 animate-pulse rounded bg-violet-tint/70" />
                    <div className="h-3 w-1/6 animate-pulse rounded bg-violet-tint/70" />
                  </div>
                </div>
              </div>
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
        /* Empty state */
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
        /* Populated */
        <div className="space-y-8">
          <DashboardMetrics
            campaignsCount={list.length}
            activeCount={activeCount}
            totalClaims={totalClaims}
            avgRate={avgRate}
          />

          <Reveal.Stagger className="space-y-3">
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
