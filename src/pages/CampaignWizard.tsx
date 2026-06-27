import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { Stepper, type StepDef } from "@/components/Stepper";
import { StepRecipients } from "@/components/admin/StepRecipients";
import { StepCreate } from "@/components/admin/StepCreate";
import { StepFund } from "@/components/admin/StepFund";
import { StepAuthorize } from "@/components/admin/StepAuthorize";
import { StepDeliver } from "@/components/admin/StepDeliver";
import { StepVesting } from "@/components/admin/StepVesting";
import type { Recipient, CampaignType } from "@/lib/recipients";
import { totalRawUnits } from "@/lib/recipients";
import { DEFAULT_SCHEDULE, type VestingSchedule, type VestingRecipientDelivery } from "@/lib/vesting";
import { saveCampaign } from "@/lib/campaigns";

const STANDARD_STEPS: StepDef[] = [
  { id: 1, label: "Recipients" },
  { id: 2, label: "Create" },
  { id: 3, label: "Fund" },
  { id: 4, label: "Authorize" },
  { id: 5, label: "Deliver" },
];

const VESTING_STEPS: StepDef[] = [
  { id: 1, label: "Recipients" },
  { id: 2, label: "Deploy" },
  { id: 3, label: "Deliver" },
];

export function CampaignWizard() {
  const navigate = useNavigate();
  const { address: adminAddress } = useAccount();

  const [current, setCurrent] = useState(1);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [campaignType, setCampaignType] = useState<CampaignType>("payroll");
  const [campaignName, setCampaignName] = useState("");
  const [schedule, setSchedule] = useState<Omit<VestingSchedule, "startTs">>(DEFAULT_SCHEDULE);
  const [vestingDeliveries, setVestingDeliveries] = useState<VestingRecipientDelivery[]>([]);

  const isVesting = campaignType === "vesting";
  const STEPS = isVesting ? VESTING_STEPS : STANDARD_STEPS;

  const [tokenAddress, setTokenAddress] = useState(
    import.meta.env.VITE_MOCK_TOKEN_ADDRESS || "",
  );
  const [campaignAddress, setCampaignAddress] = useState("");
  const [userSalt, setUserSalt] = useState<`0x${string}`>(() => {
    const now = Math.floor(Date.now() / 1000);
    return `0x${now.toString(16).padStart(64, "0")}` as `0x${string}`;
  });

  const [startTimestamp, setStartTimestamp] = useState(
    () => Math.floor(Date.now() / 1000) + 120,
  );
  const [endTimestamp, setEndTimestamp] = useState(
    () => Math.floor(Date.now() / 1000) + 7 * 86400,
  );
  const [canExtendClaimWindow, setCanExtendClaimWindow] = useState(true);

  const [authorizations, setAuthorizations] = useState<
    Array<{
      address: string;
      amount: string;
      label?: string;
      encryptedInput: { handle: string; inputProof: string };
      signature: string;
    }>
  >([]);

  const handleReset = () => {
    setRecipients([]);
    setCampaignType("payroll");
    setCampaignName("");
    setCampaignAddress("");
    setAuthorizations([]);
    setSchedule(DEFAULT_SCHEDULE);
    setVestingDeliveries([]);
    const now = Math.floor(Date.now() / 1000);
    setUserSalt(`0x${now.toString(16).padStart(64, "0")}`);
    setStartTimestamp(now + 120);
    setEndTimestamp(now + 7 * 86400);
    setCanExtendClaimWindow(true);
    setCurrent(1);
  };

  const totalAmount = totalRawUnits(recipients);

  
  
  const handleCreated = (addr: string) => {
    if (adminAddress) {
      saveCampaign({
        address: addr.toLowerCase(),
        name: campaignName.trim(),
        campaignType,
        tokenAddress,
        totalRecipients: recipients.length,
        startTimestamp,
        endTimestamp,
        createdAt: Date.now(),
        admin: adminAddress.toLowerCase(),
      });
    }
    setCampaignAddress(addr);
    setCurrent(3);
  };

  
  
  
  const handleVestingDeployed = (
    deliveries: VestingRecipientDelivery[],
    firstCampaign: string,
  ) => {
    if (adminAddress && firstCampaign) {
      
      
      
      const allTrancheAddrs = (deliveries[0]?.tranches ?? [])
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((t) => t.campaignAddress.toLowerCase());
      const children = allTrancheAddrs.filter(
        (addr) => addr !== firstCampaign.toLowerCase(),
      );
      saveCampaign({
        address: firstCampaign.toLowerCase(),
        name: campaignName.trim(),
        campaignType,
        tokenAddress,
        totalRecipients: recipients.length,
        startTimestamp,
        endTimestamp,
        createdAt: Date.now(),
        admin: adminAddress.toLowerCase(),
        trancheAddresses: children,
        trancheCount: allTrancheAddrs.length,
      });
    }
    setVestingDeliveries(deliveries);
    setCampaignAddress(firstCampaign);
    setCurrent(3);
  };

  const getTheme = () => {
    switch (campaignType) {
      case "investor":
        return {
          "--card-bg": "#DFD1F4",
          "--card-accent": "var(--color-violet)",
          "--card-accent-tint": "var(--color-violet-tint)",
          "--card-accent-ink": "#ffffff",
        } as React.CSSProperties;
      case "payroll":
        return {
          "--card-bg": "#DFC9C0",
          "--card-accent": "var(--color-gold)",
          "--card-accent-tint": "var(--color-gold-tint)",
          "--card-accent-ink": "#3D2E00",
        } as React.CSSProperties;
      case "vesting":
        return {
          "--card-bg": "#CFE8DD",
          "--card-accent": "#059669",
          "--card-accent-tint": "#d1fae5",
          "--card-accent-ink": "#ffffff",
        } as React.CSSProperties;
      default:
        return {
          "--card-bg": "#DFF3F6",
          "--card-accent": "#0891b2",
          "--card-accent-tint": "#e0f7fa",
          "--card-accent-ink": "#ffffff",
        } as React.CSSProperties;
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          to="/admin"
          className="link-rise inline-flex items-center gap-1.5 text-sm font-medium text-mute hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Dashboard
        </Link>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">New campaign</h1>
            <p className="mt-1 text-sm text-mute">
              Encrypted end-to-end — set up a confidential distribution in five steps.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-edge bg-panel px-3 py-1 font-mono text-xs text-mute">
            {current}/{STEPS.length}
          </span>
        </div>
      </div>

      <div 
        className="rounded-[24px] border border-edge bg-panel p-5 shadow-lg shadow-black/5 transition-colors duration-500 sm:p-8 relative overflow-hidden"
        style={getTheme()}
      >
        <div className="mb-8">
          <Stepper steps={STEPS} current={current} />
        </div>

        {current === 1 && (
          <StepRecipients
            recipients={recipients}
            setRecipients={setRecipients}
            campaignType={campaignType}
            setCampaignType={setCampaignType}
            campaignName={campaignName}
            setCampaignName={setCampaignName}
            schedule={schedule}
            setSchedule={setSchedule}
            startTs={startTimestamp}
            onNext={() => setCurrent(2)}
          />
        )}

        {}
        {isVesting && current === 2 && (
          <StepVesting
            tokenAddress={tokenAddress}
            recipients={recipients}
            schedule={schedule}
            startTs={startTimestamp}
            canExtendClaimWindow={canExtendClaimWindow}
            endTimestamp={endTimestamp}
            onSuccess={handleVestingDeployed}
            onBack={() => setCurrent(1)}
          />
        )}

        {isVesting && current === 3 && (
          <StepDeliver
            tokenAddress={tokenAddress}
            campaignAddress={campaignAddress}
            campaignName={campaignName}
            recipients={recipients}
            authorizations={[]}
            vestingDeliveries={vestingDeliveries}
            campaignType={campaignType}
            onReset={handleReset}
          />
        )}

        {!isVesting && current === 2 && (
          <StepCreate
            tokenAddress={tokenAddress}
            setTokenAddress={setTokenAddress}
            userSalt={userSalt}
            setUserSalt={setUserSalt}
            startTimestamp={startTimestamp}
            setStartTimestamp={setStartTimestamp}
            endTimestamp={endTimestamp}
            setEndTimestamp={setEndTimestamp}
            canExtendClaimWindow={canExtendClaimWindow}
            setCanExtendClaimWindow={setCanExtendClaimWindow}
            onSuccess={handleCreated}
            onBack={() => setCurrent(1)}
          />
        )}

        {!isVesting && current === 3 && (
          <StepFund
            tokenAddress={tokenAddress}
            campaignAddress={campaignAddress}
            userSalt={userSalt}
            startTimestamp={startTimestamp}
            endTimestamp={endTimestamp}
            canExtendClaimWindow={canExtendClaimWindow}
            totalAmount={totalAmount}
            onSuccess={() => setCurrent(4)}
            onBack={() => setCurrent(2)}
          />
        )}

        {!isVesting && current === 4 && (
          <StepAuthorize
            campaignAddress={campaignAddress}
            recipients={recipients}
            onSuccess={(auths) => {
              setAuthorizations(auths);
              setCurrent(5);
            }}
            onBack={() => setCurrent(3)}
          />
        )}

        {!isVesting && current === 5 && (
          <StepDeliver
            tokenAddress={tokenAddress}
            campaignAddress={campaignAddress}
            campaignName={campaignName}
            recipients={recipients}
            authorizations={authorizations}
            campaignType={campaignType}
            onReset={handleReset}
          />
        )}
      </div>

      {current === STEPS.length && (
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/admin")}
            className="link-rise text-sm font-semibold text-violet-deep"
          >
            View on dashboard →
          </button>
        </div>
      )}
    </div>
  );
}
