import { useState } from "react";
import {
  useAccount,
  useChainId,
  useWriteContract,
  useBalance,
  usePublicClient,
} from "wagmi";
import { formatEther } from "viem";
import { getFheAirdropFactoryAddress } from "@tokenops/sdk";
import { useZamaSDK } from "@zama-fhe/react-sdk";
import {
  useCreateAndFundConfidentialAirdropAndGetAddress,
  encryptUint64,
  useSignClaimAuthorization,
} from "@tokenops/sdk/fhe-airdrop/react";
import type { Recipient } from "@/lib/recipients";
import { formatTokens } from "@/lib/recipients";
import {
  type VestingSchedule,
  type VestingRecipientDelivery,
  type VestingTrancheAuth,
  GAS_PER_TRANCHE_ETH,
  clampTrancheCount,
  computeTranches,
  buildRecipientPlans,
  tranchePoolTotalsRaw,
  formatUnlockDate,
} from "@/lib/vesting";

// ERC-7984 setOperator — deadline is uint48. One-time approval; reused by every
// tranche deploy.
const erc7984SetOperatorAbi = [
  {
    type: "function",
    name: "setOperator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "until", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

type TrancheState = "pending" | "deploying" | "authorizing" | "done" | "failed";

interface StepVestingProps {
  tokenAddress: string;
  recipients: Recipient[];
  schedule: Omit<VestingSchedule, "startTs">;
  startTs: number;
  canExtendClaimWindow: boolean;
  endTimestamp: number;
  onSuccess: (deliveries: VestingRecipientDelivery[], firstCampaignAddress: string) => void;
  onBack: () => void;
}

const isTransientRelayerError = (msg: string) =>
  /timed out|fetch failed|Fetch POST failed|ENCRYPT|NODE_INIT|worker pool|initialize FHE|network|relayer|ECONNRESET|ETIMEDOUT/i.test(
    msg,
  );

/**
 * StepVesting — vesting-only orchestrator that REPLACES the create/fund/authorize
 * steps. For an N-tranche schedule it runs:
 *   1× setOperator(factory)  →  N× createAndFund (one airdrop per dated tranche)
 *   →  N×R encrypt + sign authorizations.
 * Progress is tracked per tranche; relayer hiccups retry the encrypt/deploy.
 * Resumable: completed tranches are kept so a mid-run failure can continue.
 */
export function StepVesting({
  tokenAddress,
  recipients,
  schedule,
  startTs,
  canExtendClaimWindow,
  endTimestamp,
  onSuccess,
  onBack,
}: StepVestingProps) {
  const { address: adminAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const zamaSDK = useZamaSDK();

  const count = clampTrancheCount(schedule.trancheCount);
  const tranches = computeTranches({ ...schedule, trancheCount: count, startTs });
  const plans = buildRecipientPlans(recipients, count);
  const poolTotals = tranchePoolTotalsRaw(plans, count);

  const factoryAddress =
    getFheAirdropFactoryAddress(chainId) || "0xbE6A3B78B36684fFee48De77d47Bc3393F5Acd4c";

  const { data: ethBalance } = useBalance({ address: adminAddress });
  const estTotalEth = count * GAS_PER_TRANCHE_ETH;
  const isLowEth =
    ethBalance !== undefined &&
    Number(formatEther(ethBalance.value)) < estTotalEth * 1.1;

  const { writeContractAsync } = useWriteContract();
  const createAndFund = useCreateAndFundConfidentialAirdropAndGetAddress({
    encryptor: () => zamaSDK.relayer,
  });
  const signMutation = useSignClaimAuthorization();

  const [operatorApproved, setOperatorApproved] = useState(false);
  const [states, setStates] = useState<TrancheState[]>(() => tranches.map(() => "pending"));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  // Completed authorizations accumulated per recipient (lowercased address →
  // their tranche auths). Survives a mid-run failure so Resume can continue.
  const [recipientAuths, setRecipientAuths] = useState<Record<string, VestingTrancheAuth[]>>({});

  const setState = (i: number, s: TrancheState) =>
    setStates((prev) => {
      const next = [...prev];
      next[i] = s;
      return next;
    });

  const doneCount = states.filter((s) => s === "done").length;

  const withRelayerRetry = async <T,>(fn: () => Promise<T>, label: string): Promise<T> => {
    const ATTEMPTS = 4;
    for (let i = 1; i <= ATTEMPTS; i++) {
      try {
        return await fn();
      } catch (err: any) {
        const msg = (err?.message ?? String(err)) + " " + (err?.cause?.message ?? "");
        if (isTransientRelayerError(msg) && i < ATTEMPTS) {
          setProgress(`${label} — relayer slow, retrying (${i}/${ATTEMPTS})…`);
          await new Promise((r) => setTimeout(r, 1500 * i));
          continue;
        }
        throw err;
      }
    }
    throw new Error("unreachable");
  };

  const run = async () => {
    setErrorMsg("");
    if (!isConnected || !adminAddress) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }
    setRunning(true);

    try {
      // 1) One-time operator approval — lets the factory pull tokens for funding.
      if (!operatorApproved) {
        setProgress("Approving the factory to move your tokens…");
        const until = 2_000_000_000; // ~2033
        const hash = await writeContractAsync({
          address: tokenAddress as `0x${string}`,
          abi: erc7984SetOperatorAbi,
          functionName: "setOperator",
          args: [factoryAddress, until],
        });
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status !== "success") throw new Error("Operator approval reverted on-chain.");
        }
        setOperatorApproved(true);
      }

      // 2) For each not-yet-done tranche: deploy+fund, then authorize each
      // recipient, pushing their auth into a per-recipient accumulator.
      const byRecipient = new Map<string, VestingTrancheAuth[]>(
        plans.map((p) => [
          p.recipient.address.toLowerCase(),
          [...(recipientAuths[p.recipient.address.toLowerCase()] ?? [])],
        ]),
      );
      let firstCampaign = "";

      for (let t = 0; t < tranches.length; t++) {
        const tranche = tranches[t];
        if (states[t] === "done") {
          if (!firstCampaign) {
            const any = [...byRecipient.values()].flat().find((a) => a.index === t);
            if (any) firstCampaign = any.campaignAddress;
          }
          continue;
        }

        // Deploy + fund this tranche's pool.
        setState(t, "deploying");
        setProgress(`Unlock ${t + 1}/${tranches.length}: deploying & funding…`);
        const params = {
          token: tokenAddress as `0x${string}`,
          startTimestamp: tranche.unlockTs,
          endTimestamp: Math.max(endTimestamp, tranche.unlockTs + 365 * 86_400),
          canExtendClaimWindow,
          admin: adminAddress,
        };
        // Unique salt per tranche so each gets a distinct clone address.
        const saltSeed = (BigInt(startTs) * 1000n + BigInt(t)).toString(16).padStart(64, "0");
        const userSalt = `0x${saltSeed}` as `0x${string}`;

        const { airdrop } = await withRelayerRetry(
          () =>
            createAndFund.mutateAsync({
              token: tokenAddress as `0x${string}`,
              params,
              userSalt,
              deployer: adminAddress,
              gasFee: 0n,
              amount: poolTotals[t],
            }),
          `Unlock ${t + 1}`,
        );
        if (!firstCampaign) firstCampaign = airdrop;

        // Authorize each recipient for their slice of this tranche.
        setState(t, "authorizing");
        for (let r = 0; r < plans.length; r++) {
          const plan = plans[r];
          const amtRaw = plan.amountsRaw[t];
          if (amtRaw <= 0n) continue;
          setProgress(`Unlock ${t + 1}/${tranches.length}: authorizing ${r + 1}/${plans.length}…`);
          const encrypted = await withRelayerRetry(
            () =>
              encryptUint64({
                encryptor: zamaSDK.relayer,
                contractAddress: airdrop as `0x${string}`,
                userAddress: plan.recipient.address as `0x${string}`,
                value: amtRaw,
              }),
            `Unlock ${t + 1} encrypt`,
          );
          const signature = await signMutation.mutateAsync({
            airdropAddress: airdrop as `0x${string}`,
            recipient: plan.recipient.address as `0x${string}`,
            encryptedAmountHandle: encrypted.handle,
          });
          const key = plan.recipient.address.toLowerCase();
          byRecipient.get(key)!.push({
            index: t,
            campaignAddress: airdrop,
            unlockTs: tranche.unlockTs,
            amount: formatTokens(amtRaw),
            encryptedInput: { handle: encrypted.handle, inputProof: encrypted.inputProof },
            signature,
          });
        }

        // Persist progress after each completed tranche (enables Resume).
        setRecipientAuths(Object.fromEntries(byRecipient));
        setState(t, "done");
      }

      // 3) Build per-recipient deliveries (tranches sorted by unlock order).
      const deliveries: VestingRecipientDelivery[] = plans.map((plan) => {
        const mine = [...(byRecipient.get(plan.recipient.address.toLowerCase()) ?? [])].sort(
          (a, b) => a.index - b.index,
        );
        return {
          address: plan.recipient.address,
          label: plan.recipient.label,
          totalAmount: formatTokens(plan.amountsRaw.reduce((s, a) => s + a, 0n)),
          tranches: mine,
        };
      });

      setProgress("Vesting schedule deployed.");
      setRunning(false);
      onSuccess(deliveries, firstCampaign);
    } catch (err: any) {
      console.error("Vesting deploy failed", err);
      const msg = (err?.message ?? String(err)) + " " + (err?.cause?.message ?? "");
      setStates((prev) => prev.map((s) => (s === "deploying" || s === "authorizing" ? "failed" : s)));
      setErrorMsg(
        isTransientRelayerError(msg)
          ? "The Zama relayer/RPC is unresponsive. Completed unlocks are saved — click Resume to continue."
          : err?.message || "Vesting deployment failed.",
      );
      setRunning(false);
    }
  };

  const allDone = doneCount === tranches.length && tranches.length > 0;

  return (
    <div className="animate-step-in space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Deploy vesting schedule</h2>
        <p className="text-sm text-mute">
          Each unlock is deployed as its own confidential airdrop with a future claim date, then
          every recipient's slice is encrypted and authorized.
        </p>
      </div>

      {/* Gas summary */}
      <div className="rounded-xl border border-edge bg-panel-2 p-5 space-y-3 text-sm shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-ink/60 font-medium">Unlocks to deploy</span>
          <span className="font-mono font-bold" style={{ color: "var(--card-accent)" }}>{tranches.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink/60 font-medium">Est. gas (all unlocks)</span>
          <span className="font-mono font-semibold text-ink">~{estTotalEth.toFixed(2)} ETH</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink/60 font-medium">Your gas balance</span>
          <span className={"font-mono font-semibold " + (isLowEth ? "text-danger" : "text-ink")}>
            {ethBalance ? `${Number(formatEther(ethBalance.value)).toFixed(4)} ETH` : "—"}
          </span>
        </div>
      </div>

      {isLowEth && (
        <div className="flex items-start gap-3 rounded-[14px] border border-danger/20 bg-danger/10 p-4 text-xs text-danger shadow-inner">
          <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            Low on Sepolia ETH for {tranches.length} deploys (~{estTotalEth.toFixed(2)} ETH). Top up before
            running, or a later unlock may fail. Already-deployed unlocks are saved and resumable.
          </div>
        </div>
      )}

      {/* Per-tranche status */}
      <div className="rounded-xl border border-edge bg-panel shadow-sm overflow-hidden">
        <ol className="divide-y divide-edge/60">
          {tranches.map((t, i) => {
            const st = states[i];
            return (
              <li key={t.index} className="flex items-center gap-3 px-4 py-3">
                <TrancheMarker state={st} n={i + 1} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">Unlock {i + 1}</p>
                  <p className="text-xs text-mute">{formatUnlockDate(t.unlockTs)}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-ink">{formatTokens(poolTotals[i] ?? 0n)}</span>
                <StatusLabel state={st} />
              </li>
            );
          })}
        </ol>
      </div>

      {progress && running && (
        <div className="flex items-center gap-3 rounded-[14px] border border-edge bg-panel-2 p-4 text-xs font-medium text-ink/80 shadow-xs">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--card-accent)", borderTopColor: "transparent" }} />
          {progress}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-[14px] border border-danger/20 bg-danger/10 p-4 text-sm text-danger shadow-inner">
          <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <p className="font-semibold mb-0.5">Deployment failed</p>
            <p className="text-danger/80">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-edge pt-6 mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <button
          onClick={onBack}
          disabled={running}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-edge bg-panel px-6 py-3 text-sm font-medium text-ink transition-all duration-150 hover:bg-panel-2 disabled:opacity-50"
        >
          ← Back
        </button>
        {!allDone && (
          <button
            onClick={run}
            disabled={running || !isConnected}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 hover:-translate-y-0.5"
            style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
          >
            {running ? "Deploying…" : doneCount > 0 ? "Resume deployment" : `Deploy ${tranches.length} unlocks`}
          </button>
        )}
      </div>
    </div>
  );
}

function TrancheMarker({ state, n }: { state: TrancheState; n: number }) {
  if (state === "done") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: "var(--card-accent)" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
    );
  }
  if (state === "deploying" || state === "authorizing") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: "var(--card-accent)", backgroundColor: "var(--card-accent-tint)" }}>
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--card-accent)", borderTopColor: "transparent" }} />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </span>
    );
  }
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-panel-2 text-xs font-bold text-mute/50">{n}</span>;
}

function StatusLabel({ state }: { state: TrancheState }) {
  const map: Record<TrancheState, { text: string; cls: string }> = {
    pending: { text: "Pending", cls: "text-ink/40" },
    deploying: { text: "Deploying…", cls: "text-ink/70 animate-pulse" },
    authorizing: { text: "Authorizing…", cls: "text-ink/70 animate-pulse" },
    done: { text: "Ready", cls: "text-success-text" },
    failed: { text: "Failed", cls: "text-danger" },
  };
  const { text, cls } = map[state];
  return <span className={"w-20 text-right text-xs font-semibold " + cls}>{text}</span>;
}
