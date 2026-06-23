import { useState, useEffect } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { formatEther } from "viem";
import { getFheAirdropFactoryAddress } from "@tokenops/sdk";
import { useZamaSDK } from "@zama-fhe/react-sdk";
import { useFundConfidentialAirdrop, useFactoryDefaultGasFee, useFactoryCustomFee } from "@tokenops/sdk/fhe-airdrop/react";
import { formatTokens, shortAddress } from "@/lib/recipients";

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
  const {
    isLoading: isApproveConfirming,
    data: approveReceipt,
    isError: isApproveReceiptError,
  } = useWaitForTransactionReceipt({ hash: approveTxHash });

  // useWaitForTransactionReceipt resolves successfully even when the tx REVERTED
  // (status: "reverted") — so gate "done" on the receipt status, not just on the
  // query succeeding. A reverted approval must NOT unlock the deposit step.
  const approveReverted = approveReceipt?.status === "reverted";

  // Surface a reverted / failed approval and let the user re-approve (clearing the
  // hash brings the Approve button back).
  useEffect(() => {
    if (approveReverted || isApproveReceiptError) {
      setErrorMsg(
        "The approval transaction failed on-chain. Check your token balance/network and approve again.",
      );
      setApproveTxHash(undefined);
    }
  }, [approveReverted, isApproveReceiptError]);

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

  // Only a confirmed-successful receipt counts as done.
  const isApproveDone = approveReceipt?.status === "success";

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

      <div className="rounded-xl border border-edge bg-panel-2 p-5 space-y-4 text-sm shadow-xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-0">
          <span className="text-ink/60 font-medium">Campaign clone</span>
          <span className="font-mono font-medium text-ink hidden sm:inline break-all bg-panel px-2 py-0.5 rounded-md border border-edge">{campaignAddress}</span>
          <span className="font-mono font-medium text-ink sm:hidden bg-panel px-2 py-0.5 rounded-md border border-edge">{shortAddress(campaignAddress)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ink/60 font-medium">Required tokens</span>
          <span className="font-mono font-bold text-lg" style={{ color: "var(--card-accent)" }}>
            {formatTokens(totalAmount)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ink/60 font-medium">Your gas balance</span>
          <span className={"font-mono font-semibold " + (isLowEth ? "text-danger bg-danger/10 px-2 py-0.5 rounded-md" : "text-ink bg-panel px-2 py-0.5 rounded-md border border-edge")}>
            {ethBalance ? `${Number(formatEther(ethBalance.value)).toFixed(4)} ETH` : "—"}
          </span>
        </div>
      </div>

      {isLowEth && (
        <div className="flex items-start gap-3 rounded-[14px] border border-danger/20 bg-danger/10 p-4 text-xs text-danger shadow-inner">
          <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            Low on Sepolia ETH. Creating + funding a campaign costs roughly <span className="font-mono font-bold">~0.05 ETH</span> in
            gas (FHE operations are heavy). Top up before funding, or the transaction may fail with "insufficient funds."
          </div>
        </div>
      )}

      {/* Two-part funding sequence. Marker is a small circle (distinct from the
          page Stepper) so it reads as a sub-task, not a competing stepper. */}
      <div className="space-y-3">
        {/* Approve */}
        <div
          className={
            "rounded-xl border p-5 transition-all duration-150 " +
            (isApproveDone ? "border-edge bg-panel-2/50" : "bg-panel shadow-sm")
          }
          style={!isApproveDone ? { borderColor: "var(--card-accent)", borderWidth: "2px" } : {}}
        >
          <div className="flex items-start gap-4">
            <span
              className={
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors " +
                (isApproveDone ? "text-white" : "")
              }
              style={
                isApproveDone 
                  ? { backgroundColor: "var(--card-accent)", borderColor: "var(--card-accent)" } 
                  : { backgroundColor: "var(--card-accent-tint)", borderColor: "var(--card-accent)", color: "var(--card-accent)" }
              }
            >
              {isApproveDone ? <MiniCheck /> : "1"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">Approve token transfer</h3>
                {isApproveDone && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success-text border border-success-text/20">
                    <MiniCheck /> Approved
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink/60">
                Authorizes the TokenOps factory to move your confidential tokens (setOperator).
              </p>
              {!isApproveDone && (
                <button
                  onClick={handleApprove}
                  disabled={isApprovePending || isApproveConfirming}
                  className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all duration-200 shadow-sm disabled:opacity-50 hover:-translate-y-0.5"
                  style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
                >
                  {isApprovePending ? "Approve in wallet…" : isApproveConfirming ? "Confirming…" : "Approve"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Deposit */}
        <div
          className={
            "rounded-xl border p-5 transition-all duration-150 " +
            (isApproveDone
              ? "bg-panel shadow-sm"
              : "border-edge/50 bg-panel-2/40 opacity-50 pointer-events-none")
          }
          style={isApproveDone ? { borderColor: "var(--card-accent)", borderWidth: "2px" } : {}}
        >
          <div className="flex items-start gap-4">
            <span
              className={
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold " +
                (!isApproveDone ? "border-white/50 text-ink/40 bg-white/40" : "")
              }
              style={
                isApproveDone 
                  ? { backgroundColor: "var(--card-accent-tint)", borderColor: "var(--card-accent)", color: "var(--card-accent)" }
                  : {}
              }
            >
              2
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-ink">Deposit &amp; encrypt</h3>
              <p className="mt-1 text-xs text-ink/60">
                Encrypts the allocation pool on-chain and deposits it into the campaign clone contract.
              </p>
              {isApproveDone && (
                <button
                  onClick={handleFund}
                  disabled={fundMutation.isPending}
                  className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all duration-200 shadow-sm disabled:opacity-50 hover:-translate-y-0.5"
                  style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
                >
                  {retryNotice
                    ? "Retrying encryption…"
                    : fundMutation.isPending
                      ? "Encrypting & funding…"
                      : "Fund campaign"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {retryNotice && !errorMsg && (
        <div className="flex items-center gap-3 rounded-[14px] border border-edge bg-panel-2 p-4 text-xs font-medium text-ink/80 shadow-xs">
          <span 
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent" 
            style={{ borderColor: "var(--card-accent)", borderTopColor: "transparent" }}
          />
          {retryNotice}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-[14px] border border-danger/20 bg-danger/10 p-4 text-sm text-danger shadow-inner">
          <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <p className="font-semibold mb-0.5">Transaction failed</p>
            <p className="text-danger/80">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-edge pt-6 mt-8 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          disabled={isApprovePending || isApproveConfirming || fundMutation.isPending}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-edge bg-panel px-6 py-3 text-sm font-medium text-ink transition-all duration-150 hover:bg-panel-2 disabled:opacity-50"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

function MiniCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
