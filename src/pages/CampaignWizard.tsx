import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { Stepper, type StepDef } from "@/components/Stepper";
import { StepRecipients } from "@/components/admin/StepRecipients";
import { StepCreate } from "@/components/admin/StepCreate";
import { StepFund } from "@/components/admin/StepFund";
import { StepAuthorize } from "@/components/admin/StepAuthorize";
import { StepDeliver } from "@/components/admin/StepDeliver";
import type { Recipient, CampaignType } from "@/lib/recipients";
import { totalRawUnits } from "@/lib/recipients";
import { saveCampaign } from "@/lib/campaigns";

const STEPS: StepDef[] = [
  { id: 1, label: "Recipients" },
  { id: 2, label: "Create" },
  { id: 3, label: "Fund" },
  { id: 4, label: "Authorize" },
  { id: 5, label: "Deliver" },
];

export function CampaignWizard() {
  const navigate = useNavigate();
  const { address: adminAddress } = useAccount();

  const [current, setCurrent] = useState(1);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [campaignType, setCampaignType] = useState<CampaignType>("payroll");
  const [campaignName, setCampaignName] = useState("");

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
    const now = Math.floor(Date.now() / 1000);
    setUserSalt(`0x${now.toString(16).padStart(64, "0")}`);
    setStartTimestamp(now + 120);
    setEndTimestamp(now + 7 * 86400);
    setCanExtendClaimWindow(true);
    setCurrent(1);
  };

  const totalAmount = totalRawUnits(recipients);

  // Persist off-chain metadata the moment the clone address is real — so the
  // campaign shows on the dashboard even if the admin stops before delivering.
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

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-0">
        <div>
          <Link
            to="/admin"
            className="link-rise mb-1 inline-block text-sm font-medium text-mute hover:text-ink"
          >
            ← Dashboard
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">New campaign</h1>
        </div>
        <span className="font-mono text-xs text-faint">
          step {current} of {STEPS.length}
          <span className="sm:hidden"> — {STEPS[current - 1]?.label}</span>
        </span>
      </header>

      <div className="rounded-2xl border border-edge bg-panel p-4 sm:p-8">
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
            onNext={() => setCurrent(2)}
          />
        )}

        {current === 2 && (
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

        {current === 3 && (
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

        {current === 4 && (
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

        {current === 5 && (
          <StepDeliver
            tokenAddress={tokenAddress}
            campaignAddress={campaignAddress}
            authorizations={authorizations}
            campaignType={campaignType}
            onReset={handleReset}
          />
        )}
      </div>

      {current === 5 && (
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
