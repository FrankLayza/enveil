import { useState } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
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

  const factoryAddress = getFheAirdropFactoryAddress(chainId) || "0xbE6A3B78B36684fFee48De77d47Bc3393F5Acd4c";

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

  const handleFund = async () => {
    setErrorMsg("");
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

    try {
      await fundMutation.mutateAsync(
        {
          token: tokenAddress as `0x${string}`,
          params,
          userSalt,
          deployer: adminAddress,
          gasFee,
          amount: totalAmount,
        },
        {
          onSuccess: () => {
            onSuccess();
          },
          onError: (err: any) => {
            console.error("Fund failed", err);
            setErrorMsg(err?.message || "Funding failed.");
          },
        }
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const isApproveDone = isApproveSuccess || !!approveTxHash && !isApprovePending && !isApproveConfirming;

  return (
    <div className="animate-step-in space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
          Fund the campaign
        </h2>
        <p className="text-sm text-[var(--color-mute)]">
          Authorize the factory to transfer the required tokens, then encrypt and deposit them into your campaign pool.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel-2)] p-4 space-y-3.5 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-mute)]">Campaign clone</span>
          <span className="font-mono font-medium text-[var(--color-ink)]">{campaignAddress}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-mute)]">Required tokens</span>
          <span className="font-mono font-semibold text-[var(--color-gold-dim)]">
            {formatTokens(totalAmount)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Step 3.1: Approve Operator */}
        <div className={`rounded-xl border p-5 transition-all ${isApproveDone ? "border-[var(--color-edge)] bg-[var(--color-panel)] opacity-60" : "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5"}`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm text-[var(--color-ink)]">Step 1: Approve Factory</h3>
              <p className="text-xs text-[var(--color-mute)] mt-0.5">
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
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-iris)] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[var(--color-iris-dim)] disabled:opacity-50"
            >
              {isApprovePending ? "Approve in wallet..." : isApproveConfirming ? "Confirming tx..." : "Approve Factory"}
            </button>
          )}
        </div>

        {/* Step 3.2: Deposit Funds */}
        <div className={`rounded-xl border p-5 transition-all ${isApproveDone ? "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5" : "border-[var(--color-edge)] bg-[var(--color-panel)] opacity-40 pointer-events-none"}`}>
          <h3 className="font-semibold text-sm text-[var(--color-ink)]">Step 2: Deposit and Encrypt</h3>
          <p className="text-xs text-[var(--color-mute)] mt-0.5">
            Encrypts the allocation pool on-chain and deposits it into the campaign clone contract.
          </p>

          {isApproveDone && (
            <button
              onClick={handleFund}
              disabled={fundMutation.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-iris)] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[var(--color-iris-dim)] disabled:opacity-50"
            >
              {fundMutation.isPending ? "Encrypting & Funding..." : "Fund Campaign"}
            </button>
          )}
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
          disabled={isApprovePending || isApproveConfirming || fundMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-edge-strong)] px-4 py-2.5 text-sm font-medium text-[var(--color-mute)] transition-colors duration-150 hover:text-[var(--color-ink)] disabled:opacity-50"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
