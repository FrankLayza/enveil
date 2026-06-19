import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { Reveal } from "@/components/Reveal";
import { ConnectButton } from "@/components/ConnectButton";
import { StatCard } from "@/components/admin/StatCard";
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
  const { data: campaigns, isLoading, isError } = useMyCampaigns(address);
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
        {isConnected && list.length > 0 && <NewCampaignButton />}
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
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-edge bg-panel-2" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-edge bg-panel-2" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-danger">
          Couldn't load campaigns from the network. Check your RPC connection and try again.
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
          <Reveal.Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Reveal.Item>
              <StatCard label="Campaigns" value={list.length} />
            </Reveal.Item>
            <Reveal.Item>
              <StatCard label="Active" value={activeCount} />
            </Reveal.Item>
            <Reveal.Item>
              <StatCard label="Total claims" value={totalClaims} />
            </Reveal.Item>
            <Reveal.Item>
              <StatCard label="Avg claim rate" value={avgRate === null ? "—" : `${avgRate}%`} />
            </Reveal.Item>
          </Reveal.Stagger>

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
