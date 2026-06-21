import { Link } from "react-router-dom";
import { shortAddress } from "@/lib/recipients";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusPill } from "@/components/admin/StatusPill";
import type { MergedCampaign } from "@/lib/useCampaignAnalytics";

const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function CampaignCard({
  campaign,
  claimed,
}: {
  campaign: MergedCampaign;
  claimed?: number;
}) {
  const { address, name, status, totalRecipients } = campaign;
  const hasTotal = typeof totalRecipients === "number" && totalRecipients > 0;

  const progressText =
    hasTotal && typeof claimed === "number"
      ? `${claimed} of ${totalRecipients} claimed · ${Math.round((claimed / totalRecipients!) * 100)}%`
      : typeof claimed === "number"
        ? `${claimed} claimed`
        : "—";

  return (
    <Link
      to={`/admin/c/${address}`}
      className="group block rounded-2xl border border-edge bg-panel p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-edge hover:shadow-xl hover:shadow-violet/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-ink">
            {name || shortAddress(address)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-faint">{shortAddress(address)}</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-4 space-y-2">
        <ProgressBar value={claimed ?? 0} max={hasTotal ? totalRecipients : undefined} indeterminate={!hasTotal} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-mute">{progressText}</span>
          <span className="text-faint">
            {status === "ended" ? "ended" : "ends"} {fmtDate(campaign.endTime)}
          </span>
        </div>
      </div>
    </Link>
  );
}
