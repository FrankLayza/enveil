import type { ReactNode } from "react";
import type { CampaignType } from "@/lib/recipients";

/**
 * CampaignTypeSelector — display-only campaign framing. Picking a type changes
 * copy/labels throughout the wizard (e.g. "contributor" vs "investor"); it does
 * NOT change any contract call. Same create → fund → authorize → claim pipeline.
 */
const OPTIONS: Array<{
  id: CampaignType;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: "payroll",
    label: "Contributor Payroll",
    description: "Pay DAO contributors privately. Salaries stay between you and each recipient.",
    icon: <BriefcaseIcon />,
  },
  {
    id: "investor",
    label: "Investor Distribution",
    description: "Distribute to cap-table participants without exposing allocation sizes.",
    icon: <ChartIcon />,
  },
  {
    id: "community",
    label: "Community Rewards",
    description: "Airdrop to community members. Amounts remain confidential on-chain.",
    icon: <GiftIcon />,
  },
  {
    id: "vesting",
    label: "Vesting Schedule",
    description: "Release allocations in private, scheduled unlocks. Amounts stay encrypted on-chain.",
    icon: <ClockIcon />,
  },
];

export function CampaignTypeSelector({
  value,
  onChange,
}: {
  value: CampaignType;
  onChange: (t: CampaignType) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">Campaign type</h3>
        <p className="text-xs text-mute">
          Sets the wording across the wizard. The encrypted pipeline is identical for every type.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {OPTIONS.map((opt) => {
          const selected = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={selected}
              className={
                "group relative cursor-pointer rounded-xl border p-4 text-left transition-all duration-150 " +
                (selected
                  ? "border-(--card-accent) bg-(--card-accent)/5 ring-1 ring-(--card-accent)/40"
                  : "border-edge-strong hover:-translate-y-0.5 hover:border-(--card-accent)/50 hover:bg-panel-2")
              }
            >
              {/* Selected check */}
              {selected && (
                <span
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              )}
              <span
                className={
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 " +
                  (selected ? "" : "bg-panel-2 text-mute group-hover:text-ink")
                }
                style={selected ? { backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" } : undefined}
              >
                {opt.icon}
              </span>
              <p className="mt-3 text-sm font-semibold text-ink">{opt.label}</p>
              <p className="mt-0.5 text-xs leading-snug text-mute">{opt.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Icons (Lucide-style, 24×24) ─────────────────────────────────────────── */
function BriefcaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="6" rx="0.5" />
      <rect x="13" y="7" width="3" height="10" rx="0.5" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      <path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5h4zM12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5h-4z" />
    </svg>
  );
}
