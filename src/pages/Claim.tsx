/**
 * Recipient claim — connect → verify (decrypt) → claim.
 *
 * SCAFFOLD ONLY. The real flow wires to @tokenops/sdk/fhe-airdrop/react +
 * @zama-fhe/react-sdk:
 *   1. Load payload { encryptedInput, signature, amount } from link/import
 *   2. useAirdropIsSignatureValid / useAirdropIsSignatureClaimed → eligibility
 *   3. On "Reveal": useGetClaimAmount → userDecrypt (one EIP-712 sig) → show amount
 *   4. useClaim({ signature, encryptedInput }) → success + show confidential balance
 */
import { useAccount } from "wagmi";

export function Claim() {
  const { isConnected } = useAccount();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Claim your allocation</h1>
      <p className="mt-2 text-neutral-400">
        Verify your private allocation and claim — only you can decrypt it.
      </p>

      <div className="mt-8 rounded-xl border border-white/10 p-6">
        {!isConnected ? (
          <p className="text-sm text-neutral-400">
            Connect your wallet to check eligibility.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-white/5 p-4 text-sm text-neutral-400">
              Eligibility check not yet wired — scaffold step.
            </div>
            <button
              disabled
              className="w-full rounded-lg bg-white px-4 py-2.5 font-medium text-neutral-900 disabled:opacity-50"
            >
              Reveal my allocation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
