import type { CampaignStatus } from "@/lib/useCampaignAnalytics";

const STYLES: Record<CampaignStatus, string> = {
  scheduled: "border-edge bg-panel-2 text-faint",
  active: "border-violet-edge bg-violet-tint text-violet-deep",
  ended: "border-edge bg-recessed/40 text-mute",
};
const DOT: Record<CampaignStatus, string> = {
  scheduled: "bg-faint",
  active: "bg-violet",
  ended: "bg-mute",
};
const LABEL: Record<CampaignStatus, string> = {
  scheduled: "Scheduled",
  active: "Active",
  ended: "Ended",
};

export function StatusPill({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium " +
        STYLES[status]
      }
    >
      <span className={"h-1.5 w-1.5 rounded-full " + DOT[status]} />
      {LABEL[status]}
    </span>
  );
}
