import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { useCreateConfidentialAirdropAndGetAddress } from "@tokenops/sdk/fhe-airdrop/react";

interface StepCreateProps {
  tokenAddress: string;
  setTokenAddress: (val: string) => void;
  userSalt: `0x${string}`;
  setUserSalt: (val: `0x${string}`) => void;
  startTimestamp: number;
  setStartTimestamp: (val: number) => void;
  endTimestamp: number;
  setEndTimestamp: (val: number) => void;
  canExtendClaimWindow: boolean;
  setCanExtendClaimWindow: (val: boolean) => void;
  onSuccess: (campaignAddress: string) => void;
  onBack: () => void;
}

export function StepCreate({
  tokenAddress,
  setTokenAddress,
  userSalt,
  setUserSalt,
  startTimestamp,
  setStartTimestamp,
  endTimestamp,
  setEndTimestamp,
  canExtendClaimWindow,
  setCanExtendClaimWindow,
  onSuccess,
  onBack,
}: StepCreateProps) {
  const { address: adminAddress, isConnected } = useAccount();
  const [errorMsg, setErrorMsg] = useState("");

  // Convert Unix timestamps to datetime-local strings
  const toDateTimeString = (ts: number) => {
    const d = new Date(ts * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [startStr, setStartStr] = useState(() => toDateTimeString(startTimestamp));
  const [endStr, setEndStr] = useState(() => toDateTimeString(endTimestamp));

  // Sync back to parent when string dates change
  useEffect(() => {
    try {
      const sTs = Math.floor(new Date(startStr).getTime() / 1000);
      if (!isNaN(sTs)) setStartTimestamp(sTs);
    } catch {}
  }, [startStr, setStartTimestamp]);

  useEffect(() => {
    try {
      const eTs = Math.floor(new Date(endStr).getTime() / 1000);
      if (!isNaN(eTs)) setEndTimestamp(eTs);
    } catch {}
  }, [endStr, setEndTimestamp]);

  const generateNewSalt = () => {
    const rand = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    ).join("");
    setUserSalt(`0x${rand}`);
  };

  const createMutation = useCreateConfidentialAirdropAndGetAddress();

  const handleDeploy = async () => {
    setErrorMsg("");
    if (!isConnected || !adminAddress) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }
    if (!isAddress(tokenAddress)) {
      setErrorMsg("Invalid token address. Must be a valid ERC-7984 contract.");
      return;
    }
    if (startTimestamp >= endTimestamp) {
      setErrorMsg("Start time must be before end time.");
      return;
    }

    const params = {
      token: tokenAddress as `0x${string}`,
      startTimestamp,
      endTimestamp,
      canExtendClaimWindow,
      admin: adminAddress,
    };

    try {
      await createMutation.mutateAsync(
        { params, userSalt },
        {
          onSuccess: (data) => {
            onSuccess(data.airdrop);
          },
          onError: (err: any) => {
            console.error("Deploy failed", err);
            setErrorMsg(err?.message || "Transaction failed or rejected.");
          },
        }
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const isMockToken =
    import.meta.env.VITE_MOCK_TOKEN_ADDRESS &&
    tokenAddress.toLowerCase() === import.meta.env.VITE_MOCK_TOKEN_ADDRESS.toLowerCase();

  return (
    <div className="animate-step-in space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Deploy airdrop clone
        </h2>
        <p className="text-sm text-mute">
          This deploys a new instance of the audited TokenOps clone contract. Only you can admin this campaign.
        </p>
      </div>

      <div className="space-y-4">
        {/* Token Address */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-faint mb-1.5">
            Confidential Token (ERC-7984) Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              spellCheck={false}
              className="w-full rounded-xl border border-edge bg-panel-2 px-4 py-3 font-mono text-sm text-ink placeholder:text-mute/50 transition-all duration-150 hover:border-edge-strong focus:border-(--card-accent) focus:bg-panel focus:outline-none focus:ring-4 focus:ring-(--card-accent)/10 shadow-xs"
            />
            {isMockToken && (
              <span 
                className="absolute right-3 top-3 rounded-md px-2 py-1 text-[10px] font-bold"
                style={{ backgroundColor: "var(--card-accent-tint)", color: "var(--card-accent)" }}
              >
                cMockToken Faucet
              </span>
            )}
          </div>
        </div>

        {/* Start / End dates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-faint mb-1.5">
              Start Claim Time
            </label>
            <input
              type="datetime-local"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
              className="w-full rounded-xl border border-edge bg-panel-2 px-4 py-3 text-sm text-ink transition-all duration-150 hover:border-edge-strong focus:border-(--card-accent) focus:bg-panel focus:outline-none focus:ring-4 focus:ring-(--card-accent)/10 shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-faint mb-1.5">
              End Claim Time
            </label>
            <input
              type="datetime-local"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
              className="w-full rounded-xl border border-edge bg-panel-2 px-4 py-3 text-sm text-ink transition-all duration-150 hover:border-edge-strong focus:border-(--card-accent) focus:bg-panel focus:outline-none focus:ring-4 focus:ring-(--card-accent)/10 shadow-xs"
            />
          </div>
        </div>

        {/* Can Extend Claim Window */}
        <label className="flex items-center gap-2.5 cursor-pointer py-1">
          <input
            type="checkbox"
            checked={canExtendClaimWindow}
            onChange={(e) => setCanExtendClaimWindow(e.target.checked)}
            className="h-5 w-5 rounded border-edge"
            style={{ accentColor: "var(--card-accent)" }}
          />
          <div className="text-sm">
            <p className="font-medium text-ink">Allow claim window extension</p>
            <p className="text-xs text-mute">Allows you to extend the end date later.</p>
          </div>
        </label>

        {/* Salt */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-faint mb-1.5">
            Salt (for CREATE2 address predictability)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={userSalt}
              className="flex-1 rounded-xl border border-edge bg-panel-2/60 px-4 py-3 text-xs font-mono text-mute focus:outline-none"
            />
            <button
              onClick={generateNewSalt}
              className="rounded-xl border border-edge bg-panel px-4 py-3 text-sm font-medium text-ink hover:bg-panel-2 hover:border-edge-strong transition-all duration-150"
            >
              Regen
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-[14px] border border-danger/20 bg-danger/10 p-4 text-sm text-danger shadow-inner">
          <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <p className="font-semibold mb-0.5">Deployment failed</p>
            <p className="text-danger/80">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-edge pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0 mt-8">
        <button
          onClick={onBack}
          disabled={createMutation.isPending}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-edge bg-panel px-6 py-3 text-sm font-medium text-ink transition-all duration-150 hover:bg-panel-2 disabled:opacity-50"
        >
          ← Back
        </button>

        <button
          onClick={handleDeploy}
          disabled={createMutation.isPending || !isConnected}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
        >
          {createMutation.isPending ? "Deploying..." : "Deploy campaign"}
        </button>
      </div>
    </div>
  );
}
