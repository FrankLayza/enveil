import { useState } from "react";
import { useAccount } from "wagmi";
import { useConfidentialBalance } from "@zama-fhe/react-sdk";
import { formatTokens, shortAddress } from "@/lib/recipients";
import { env } from "@/lib/env";

/**
 * ConfidentialBalance — reveal the connected wallet's confidential cmUSD balance.
 *
 * A confidential ERC-7984 balance is encrypted on-chain (no wallet can display
 * it). The only way to see it is to decrypt it yourself — which is exactly what
 * this does: useConfidentialBalance reads the on-chain handle and decrypts via
 * the relayer (one EIP-712 signature). Lazy: only runs when the user clicks,
 * so we never force a signature prompt unprompted.
 */
export function ConfidentialBalance({ tokenAddress }: { tokenAddress?: `0x${string}` }) {
  const { address, isConnected } = useAccount();
  const [revealed, setRevealed] = useState(false);

  const token = (tokenAddress ?? env.tokenAddress) as `0x${string}` | "";

  const balanceQuery = useConfidentialBalance(
    { tokenAddress: token as `0x${string}` },
    { enabled: revealed && !!token && isConnected },
  );

  if (!token) {
    return (
      <div className="rounded-xl border border-edge bg-panel-2 p-4 text-xs text-mute">
        No token configured (set VITE_MOCK_TOKEN_ADDRESS).
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Your confidential balance</p>
          <p className="mt-0.5 font-mono text-xs text-faint">
            {address ? shortAddress(address) : "—"} · cmUSD
          </p>
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            disabled={!isConnected}
            className="rounded-md border border-gold/40 bg-gold-tint/40 px-4 py-2 text-xs font-semibold text-gold-dim transition-all hover:bg-gold-tint/70 disabled:opacity-50"
          >
            Reveal balance
          </button>
        ) : balanceQuery.isError ? (
          <button
            onClick={() => balanceQuery.refetch()}
            className="rounded-md border border-edge-strong px-4 py-2 text-xs font-semibold text-mute hover:bg-panel-2 hover:text-ink"
          >
            Retry
          </button>
        ) : null}
      </div>

      {revealed && (
        <div className="mt-4 border-t border-edge pt-4">
          {balanceQuery.isPending ? (
            <div className="flex items-center gap-2 text-sm text-mute">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gold-dim/30 border-t-gold-dim" />
              Decrypting your balance…
            </div>
          ) : balanceQuery.isError ? (
            <p className="text-xs text-danger">
              {balanceQuery.error?.message || "Could not decrypt balance."}
            </p>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="animate-reveal font-mono text-2xl font-medium tabular-nums text-ink">
                {formatTokens(balanceQuery.data ?? 0n)}
              </span>
              <span className="font-mono text-sm text-mute">cmUSD</span>
            </div>
          )}
          <p className="mt-2 text-xs text-faint">
            Decrypted locally with your wallet signature — visible only to you.
          </p>
        </div>
      )}
    </div>
  );
}
