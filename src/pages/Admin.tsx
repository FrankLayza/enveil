import { useState } from "react";
import { Stepper, type StepDef } from "@/components/Stepper";
import { StepRecipients } from "@/components/admin/StepRecipients";
import { StepCreate } from "@/components/admin/StepCreate";
import { StepFund } from "@/components/admin/StepFund";
import { StepAuthorize } from "@/components/admin/StepAuthorize";
import { StepDeliver } from "@/components/admin/StepDeliver";
import type { Recipient } from "@/lib/recipients";
import { totalRawUnits } from "@/lib/recipients";

const STEPS: StepDef[] = [
  { id: 1, label: "Recipients" },
  { id: 2, label: "Create" },
  { id: 3, label: "Fund" },
  { id: 4, label: "Authorize" },
  { id: 5, label: "Deliver" },
];

export function Admin() {
  const [current, setCurrent] = useState(1);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  // Form states lifted for campaign parameters
  const [tokenAddress, setTokenAddress] = useState(
    import.meta.env.VITE_MOCK_TOKEN_ADDRESS || ""
  );
  const [campaignAddress, setCampaignAddress] = useState("");
  const [userSalt, setUserSalt] = useState<`0x${string}`>(() => {
    const now = Math.floor(Date.now() / 1000);
    return `0x${now.toString(16).padStart(64, "0")}` as `0x${string}`;
  });

  const [startTimestamp, setStartTimestamp] = useState(
    () => Math.floor(Date.now() / 1000) + 120 // 2 minutes from now
  );
  const [endTimestamp, setEndTimestamp] = useState(
    () => Math.floor(Date.now() / 1000) + 7 * 86400 // 7 days from now
  );
  const [canExtendClaimWindow, setCanExtendClaimWindow] = useState(true);

  // Authorization payloads saved at Step 4, shown/delivered at Step 5
  const [authorizations, setAuthorizations] = useState<
    Array<{
      address: string;
      amount: string;
      encryptedInput: { handle: string; inputProof: string };
      signature: string;
    }>
  >([]);

  const handleReset = () => {
    setRecipients([]);
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

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Campaign wizard</h1>
        <span className="font-mono text-xs text-faint">
          step {current} of {STEPS.length}
        </span>
      </header>

      <div className="rounded-2xl border border-edge bg-panel p-6 sm:p-8">
        <div className="mb-8">
          <Stepper steps={STEPS} current={current} />
        </div>

        {current === 1 && (
          <StepRecipients
            recipients={recipients}
            setRecipients={setRecipients}
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
            onSuccess={(addr) => {
              setCampaignAddress(addr);
              setCurrent(3);
            }}
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
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
