import { useState } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { formatEther } from "viem";
import { getFheAirdropFactoryAddress } from "@tokenops/sdk";
import { useZamaSDK } from "@zama-fhe/react-sdk";
import { useFundConfidentialAirdrop, useFactoryDefaultGasFee, useFactoryCustomFee } from "@tokenops/sdk/fhe-airdrop/react";
import { formatTokens } from "@/lib/recipients";

interface StepFundProps {
  tokenAddress: string;
  campaignAddress: string;
  userSalt: `0x${string}`;
  startTimestamp: number;
  endTimestamp: number;
  canExtendClaimWindow: boolean;
  totalAmount: bigint;
  onSuccess: () => void;
  onBack: () => void;
}

// Minimal ERC-7984 setOperator ABI — deadline is uint48
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

export function StepFund({
  tokenAddress,
  campaignAddress,
  userSalt,
  startTimestamp,
  endTimestamp,
  canExtendClaimWindow,
  totalAmount,
  onSuccess,
  onBack,
}: StepFundProps) {
  const { address: adminAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const zamaSDK = useZamaSDK();

  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState("");
  const [retryNotice, setRetryNotice] = useState("");

  const factoryAddress = getFheAirdropFactoryAddress(chainId) || "0xbE6A3B78B36684fFee48De77d47Bc3393F5Acd4c";

  // Admin ETH balance — create+fund is gas-heavy (~0.045 ETH measured). Warn low.
  const { data: ethBalance } = useBalance({ address: adminAddress });
  const LOW_ETH_THRESHOLD = 50_000_000_000_000_000n; // 0.05 ETH in wei
  const isLowEth = ethBalance !== undefined && ethBalance.value < LOW_ETH_THRESHOLD;

  // Gas fee resolution
  const { data: defaultFee } = useFactoryDefaultGasFee();
  const { data: customFee } = useFactoryCustomFee({ creator: adminAddress });
  const gasFee = customFee?.enabled ? customFee.gasFee : (defaultFee ?? 0n);

  // Operator approval
  const { writeContractAsync: approveOperator, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  // Funding mutation
  const fundMutation = useFundConfidentialAirdrop({
    encryptor: () => zamaSDK.relayer,
  });

  const handleApprove = async () => {
    setErrorMsg("");
    try {
      const until = 2_000_000_000; // ~year 2033
      const hash = await approveOperator({
        address: tokenAddress as `0x${string}`,
        abi: erc7984SetOperatorAbi,
        functionName: "setOperator",
        args: [factoryAddress, until],
      });
      setApproveTxHash(hash);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Approval transaction failed.");
    }
  };

  // The Zama public testnet relayer intermittently times out / fetch-fails on the
  // ENCRYPT step (30s timeout is hardcoded in the SDK worker). Encryption throws
  // BEFORE any on-chain submit, so retrying is safe and idempotent.
  const isTransientRelayerError = (msg: string) =>
    /timed out|fetch failed|Fetch POST failed|ENCRYPT|NODE_INIT|worker pool|initialize FHE|network|ECONNRESET|ETIMEDOUT/i.test(
      msg,
    );

  const handleFund = async () => {
    setErrorMsg("");
    setRetryNotice("");
    if (!isConnected || !adminAddress) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }

    const params = {
      token: tokenAddress as `0x${string}`,
      startTimestamp,
      endTimestamp,
      canExtendClaimWindow,
      admin: adminAddress,
    };

    const ATTEMPTS = 4;
    for (let i = 1; i <= ATTEMPTS; i++) {
      try {
        await fundMutation.mutateAsync({
          token: tokenAddress as `0x${string}`,
          params,
          userSalt,
          deployer: adminAddress,
          gasFee,
          amount: totalAmount,
        });
        setRetryNotice("");
        onSuccess();
        return;
      } catch (err: any) {
        const msg =
          (err?.message ?? String(err)) +
          " " +
          (err?.cause?.message ?? "");
        console.error(`Fund attempt ${i}/${ATTEMPTS} failed`, err);
        if (isTransientRelayerError(msg) && i < ATTEMPTS) {
          setRetryNotice(
            `The Zama relayer is slow right now — retrying (${i}/${ATTEMPTS})…`,
          );
          await new Promise((r) => setTimeout(r, 2000 * i));
          continue;
        }
        setRetryNotice("");
        setErrorMsg(
          isTransientRelayerError(msg)
            ? "The Zama testnet relayer is unresponsive after several tries. Please wait a moment and click Fund Campaign again."
            : err?.message || "Funding failed.",
        );
        return;
      }
    }
  };

  const isApproveDone = isApproveSuccess || !!approveTxHash && !isApprovePending && !isApproveConfirming;

  return (
    <div className="animate-step-in space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Fund the campaign
        </h2>
        <p className="text-sm text-mute">
          Authorize the factory to transfer the required tokens, then encrypt and deposit them into your campaign pool.
        </p>
      </div>

      <div className="rounded-xl border border-edge bg-panel-2 p-4 space-y-3.5 text-sm">
        <div className="flex justify-between">
          <span className="text-mute">Campaign clone</span>
          <span className="font-mono font-medium text-ink">{campaignAddress}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-mute">Required tokens</span>
          <span className="font-mono font-semibold text-gold-dim">
            {formatTokens(totalAmount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-mute">Your gas balance</span>
          <span className={"font-mono font-medium " + (isLowEth ? "text-danger" : "text-ink")}>
            {ethBalance ? `${Number(formatEther(ethBalance.value)).toFixed(4)} ETH` : "—"}
          </span>
        </div>
      </div>

      {isLowEth && (
        <div className="rounded-lg border border-gold/40 bg-gold-tint/40 p-3.5 text-xs text-gold-dim">
          Low on Sepolia ETH. Creating + funding a campaign costs roughly <span className="font-mono">~0.05 ETH</span> in
          gas (FHE operations are heavy). Top up before funding, or the transaction may fail with “insufficient funds.”
        </div>
      )}

      <div className="space-y-4">
        {/* Step 3.1: Approve Operator */}
        <div className={`rounded-xl border p-5 transition-all ${isApproveDone ? "border-edge bg-panel opacity-60" : "border-gold/30 bg-gold/5"}`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm text-ink">Step 1: Approve Factory</h3>
              <p className="text-xs text-mute mt-0.5">
                Authorizes the TokenOps factory to move your confidential tokens (runs setOperator).
              </p>
            </div>
            {isApproveDone && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                ✓ Approved
              </span>
            )}
          </div>
          {!isApproveDone && (
            <button
              onClick={handleApprove}
              disabled={isApprovePending || isApproveConfirming}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-iris px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-iris-dim disabled:opacity-50"
            >
              {isApprovePending ? "Approve in wallet..." : isApproveConfirming ? "Confirming tx..." : "Approve Factory"}
            </button>
          )}
        </div>

        {/* Step 3.2: Deposit Funds */}
        <div className={`rounded-xl border p-5 transition-all ${isApproveDone ? "border-gold/30 bg-gold/5" : "border-edge bg-panel opacity-40 pointer-events-none"}`}>
          <h3 className="font-semibold text-sm text-ink">Step 2: Deposit and Encrypt</h3>
          <p className="text-xs text-mute mt-0.5">
            Encrypts the allocation pool on-chain and deposits it into the campaign clone contract.
          </p>

          {isApproveDone && (
            <button
              onClick={handleFund}
              disabled={fundMutation.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-iris px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-iris-dim disabled:opacity-50"
            >
              {retryNotice
                ? "Retrying encryption…"
                : fundMutation.isPending
                  ? "Encrypting & Funding..."
                  : "Fund Campaign"}
            </button>
          )}
        </div>
      </div>

      {retryNotice && !errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold-tint/40 p-3.5 text-xs text-gold-dim">
          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-gold-dim/30 border-t-gold-dim" />
          {retryNotice}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-danger">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-edge pt-5">
        <button
          onClick={onBack}
          disabled={isApprovePending || isApproveConfirming || fundMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-edge-strong px-4 py-2.5 text-sm font-medium text-mute transition-colors duration-150 hover:text-ink disabled:opacity-50"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
