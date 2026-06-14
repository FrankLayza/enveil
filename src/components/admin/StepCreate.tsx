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
        <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
          Deploy airdrop clone
        </h2>
        <p className="text-sm text-[var(--color-mute)]">
          This deploys a new instance of the audited TokenOps clone contract. Only you can admin this campaign.
        </p>
      </div>

      <div className="space-y-4">
        {/* Token Address */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-faint)] mb-1.5">
            Confidential Token (ERC-7984) Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              spellCheck={false}
              className="w-full rounded-lg border border-[var(--color-edge-strong)] bg-transparent px-3 py-2 text-sm font-mono focus:outline-none"
            />
            {isMockToken && (
              <span className="absolute right-3 top-2.5 rounded bg-[var(--color-gold)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-gold-dim)]">
                cMockToken Faucet
              </span>
            )}
          </div>
        </div>

        {/* Start / End dates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-faint)] mb-1.5">
              Start Claim Time
            </label>
            <input
              type="datetime-local"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-edge-strong)] bg-transparent px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-faint)] mb-1.5">
              End Claim Time
            </label>
            <input
              type="datetime-local"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-edge-strong)] bg-transparent px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Can Extend Claim Window */}
        <label className="flex items-center gap-2.5 cursor-pointer py-1">
          <input
            type="checkbox"
            checked={canExtendClaimWindow}
            onChange={(e) => setCanExtendClaimWindow(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-edge-strong)] accent-[var(--color-iris)]"
          />
          <div className="text-sm">
            <p className="font-medium text-[var(--color-ink)]">Allow claim window extension</p>
            <p className="text-xs text-[var(--color-mute)]">Allows you to extend the end date later.</p>
          </div>
        </label>

        {/* Salt */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-faint)] mb-1.5">
            Salt (for CREATE2 address predictability)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={userSalt}
              className="flex-1 rounded-lg border border-[var(--color-edge-strong)] bg-[var(--color-panel-2)] px-3 py-2 text-xs font-mono text-[var(--color-mute)] focus:outline-none"
            />
            <button
              onClick={generateNewSalt}
              className="rounded-lg border border-[var(--color-edge-strong)] px-3 py-2 text-xs font-medium text-[var(--color-mute)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-ink)]"
            >
              Regen
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-[var(--color-danger)]">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[var(--color-edge)] pt-5">
        <button
          onClick={onBack}
          disabled={createMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-edge-strong)] px-4 py-2.5 text-sm font-medium text-[var(--color-mute)] transition-colors duration-150 hover:text-[var(--color-ink)] disabled:opacity-50"
        >
          ← Back
        </button>

        <button
          onClick={handleDeploy}
          disabled={createMutation.isPending || !isConnected}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-iris)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-[var(--color-iris-dim)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {createMutation.isPending ? "Deploying..." : "Deploy campaign"}
        </button>
      </div>
    </div>
  );
}
