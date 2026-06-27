import { Link, useNavigate } from "react-router-dom";
import { shortAddress } from "@/lib/recipients";
import { useState } from "react";
import type { MergedCampaign } from "@/lib/useCampaignAnalytics";

const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

interface CircularProgressProps {
  percent: number;
  color: string;
}

function CircularProgress({ percent, color }: CircularProgressProps) {
  const radius = 10;
  const strokeWidth = 2.5;
  const circumference = 2 * Math.PI * radius; 
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <svg className="h-8 w-8 -rotate-90 shrink-0" viewBox="0 0 24 24">
      {}
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="transparent"
        stroke="var(--color-edge)"
        strokeWidth={strokeWidth}
        className="opacity-25"
      />
      {}
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

export function CampaignCard({
  campaign,
  claimed,
}: {
  campaign: MergedCampaign;
  claimed?: number;
}) {
  const navigate = useNavigate();
  const { address, name, status, totalRecipients, startTime, endTime, campaignType } = campaign;
  const [imgFailed, setImgFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const claimedCount = claimed ?? 0;
  const total = totalRecipients ?? 0;
  const claimPercent = total > 0 ? Math.round((claimedCount / total) * 100) : 0;

  const now = Math.floor(Date.now() / 1000);
  const totalTime = endTime - startTime;
  const elapsed = now - startTime;
  const timePercent = totalTime > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalTime) * 100))) : 100;
  const daysLeft = Math.ceil((endTime - now) / 86400);

  const isUrgent = daysLeft > 0 && daysLeft <= 2 && status === "active";
  const urgencyLabel = status === "ended" ? "Ended" : isUrgent ? "Urgent" : "Active";
  const urgencyStyle =
    status === "ended"
      ? "bg-danger-bg text-danger border border-danger/10"
      : isUrgent
        ? "bg-warning-bg text-warning-text border border-warning-text/10"
        : "bg-panel-2 text-mute border border-edge/60";

  const getCardTheme = () => {
    switch (campaignType) {
      case "investor":
        return {
          accent: "var(--color-violet)",
          bg: "var(--color-violet-tint)",
          imgKeyword: "financial cap-table stock chart distribution vector",
          typeLabel: "Investor Distribution",
        };
      case "payroll":
        return {
          accent: "var(--color-gold)",
          bg: "var(--color-gold-tint)",
          imgKeyword: "workplace team ledger spreadsheet banner",
          typeLabel: "Contributor Payroll",
        };
      case "vesting":
        return {
          accent: "#059669", 
          bg: "#d1fae5",
          imgKeyword: "clock shield token release vesting banner",
          typeLabel: "Vesting Schedule",
        };
      default:
        return {
          accent: "#0891b2", 
          bg: "#e0f7fa",
          imgKeyword: "abstract gift parcel rewards community banner",
          typeLabel: "Community Rewards",
        };
    }
  };

  const theme = getCardTheme();

  const getImgUrl = () => {
    switch (campaignType) {
      case "payroll":
        return "/illustrations/contributor.jpg";
      case "investor":
        return "/illustrations/investor.jpg";
      case "vesting":
        return "/illustrations/vesting.jpg";
      default:
        return "/illustrations/community.jpg";
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={() => navigate(`/admin/c/${address}`)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-edge bg-panel transform-gpu transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-violet-edge hover:shadow-xl hover:shadow-violet/5 cursor-pointer h-full"
      style={{
        ["--card-accent" as any]: theme.accent,
        ["--card-accent-tint" as any]: theme.bg,
      }}
    >
      {}
      <div className="relative h-32 w-full overflow-hidden border-b border-edge/60 bg-panel-2">
        {!imgFailed ? (
          <img
            src={getImgUrl()}
            alt={theme.imgKeyword}
            onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col justify-end p-4 transition-transform duration-500 group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${theme.bg}, var(--color-bg))`,
            }}
          >
            {}
            <div className="absolute right-4 top-4 opacity-15">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
            </div>
          </div>
        )}

        {}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-ink/85 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
          {totalRecipients !== undefined ? (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {totalRecipients} Recipient{totalRecipients === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Confidential
            </>
          )}
        </div>

        {}
        <div
          className={`absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ` +
            (status === "active"
              ? "bg-success-bg text-success-text border-success-text/20"
              : status === "ended"
                ? "bg-danger-bg text-danger border-danger/20"
                : "bg-warning-bg text-warning-text border-warning-text/20")
          }
        >
          {status}
        </div>
      </div>

      {}
      <div className="px-5 pt-4">
        <h3 className="font-display text-base font-bold tracking-tight text-ink line-clamp-2 min-h-12">
          {name || shortAddress(address)}
        </h3>
        <p className="mt-0.5 font-mono text-[10px] text-faint">{shortAddress(address)}</p>
      </div>

      {}
      <div className="mt-4 px-5 py-4 border-y border-edge/40 bg-panel-2/40 flex items-center divide-x divide-edge/60 gap-4">
        {}
        <div className="flex-1 flex items-center gap-3">
          <CircularProgress percent={totalRecipients !== undefined && totalRecipients > 0 ? claimPercent : (claimedCount > 0 ? 100 : 0)} color="var(--card-accent)" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-mute uppercase tracking-wider">Claims</p>
            <p className="mt-0.5 text-sm font-bold text-ink flex items-center gap-1">
              {totalRecipients !== undefined && totalRecipients > 0 ? (
                <>
                  {claimPercent}%
                  <span className="text-mute/60 hover:text-ink cursor-help" title={`${claimedCount} of ${totalRecipients} claimed`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </span>
                </>
              ) : (
                <>
                  {claimedCount} claim{claimedCount === 1 ? "" : "s"}
                  <span className="text-mute/60 hover:text-ink cursor-help" title="Total recipients count is stored locally and unavailable on this device.">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {}
        <div className="flex-1 flex items-center gap-3 pl-4">
          <CircularProgress percent={timePercent} color="var(--card-accent)" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-mute uppercase tracking-wider">Time Window</p>
            <p className="mt-0.5 text-sm font-bold text-ink truncate">
              {status === "ended" ? "Ended" : daysLeft > 0 ? `${daysLeft}d left` : "Ends soon"}
            </p>
          </div>
        </div>
      </div>

      {}
      <div className="px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded bg-panel-2 px-2 py-0.5 text-[9px] font-bold text-mute uppercase tracking-wider border border-edge/60">
            {theme.typeLabel}
          </span>
          <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ` + urgencyStyle}>
            {urgencyLabel}
          </span>
        </div>
        <Link
          to={`/admin/c/${address}`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-panel text-mute transition-colors hover:border-edge-strong hover:text-ink shadow-xs"
          aria-label="View campaign details"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      {}
      <div className="mt-auto px-5 pb-4 flex items-center justify-between border-t border-edge/20 pt-3 text-[10px] text-faint font-mono">
        <div>
          Created {fmtDate(startTime)} • Secure & Private
        </div>
        <button
          onClick={handleCopy}
          className="h-6 w-6 rounded-full hover:bg-panel-2 flex items-center justify-center text-mute hover:text-ink transition-colors relative"
          title="Copy Campaign Address"
        >
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success-text">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
