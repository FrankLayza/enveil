import { useState } from "react";
import { shortAddress } from "@/lib/recipients";

interface StepDeliverProps {
  tokenAddress: string;
  campaignAddress: string;
  authorizations: Array<{
    address: string;
    amount: string;
    encryptedInput: { handle: string; inputProof: string };
    signature: string;
  }>;
  onReset: () => void;
}

export function StepDeliver({
  tokenAddress,
  campaignAddress,
  authorizations,
  onReset,
}: StepDeliverProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const getClaimLink = (auth: (typeof authorizations)[0]) => {
    const origin = window.location.origin;
    const path = "/claim";
    const hash = `c=${campaignAddress}&r=${auth.address}&a=${auth.amount}&h=${auth.encryptedInput.handle}&p=${auth.encryptedInput.inputProof}&s=${auth.signature}`;
    return `${origin}${path}#${hash}`;
  };

  const handleCopyLink = (auth: (typeof authorizations)[0], index: number) => {
    const link = getClaimLink(auth);
    navigator.clipboard.writeText(link);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadJson = () => {
    const data = {
      campaignAddress,
      tokenAddress,
      authorizations: authorizations.map((auth) => ({
        recipient: auth.address,
        amount: auth.amount,
        encryptedInput: auth.encryptedInput,
        signature: auth.signature,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dropshield-airdrop-${campaignAddress.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-step-in space-y-6">
      <div className="text-center py-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
          Airdrop Campaign Live!
        </h2>
        <p className="text-sm text-[var(--color-mute)] mt-1">
          Your campaign clone has been deployed, funded, and recipient payloads are authorized.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel-2)] p-5 space-y-3.5 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-mute)]">Airdrop Address</span>
          <span className="font-mono font-medium text-[var(--color-ink)]">{campaignAddress}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-mute)]">Total Recipients</span>
          <span className="font-mono font-medium text-[var(--color-ink)]">{authorizations.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">Deliver allocations</h3>
          <p className="text-xs text-[var(--color-mute)] mt-0.5">
            Amounts are private and never go on-chain. Share the signed EIP-712 claims with your recipients.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownloadJson}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-iris)] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--color-iris-dim)]"
          >
            <DownloadIcon /> Download JSON Payload
          </button>
        </div>

        {/* Links list */}
        <div className="border border-[var(--color-edge)] rounded-xl bg-[var(--color-panel)] max-h-60 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-panel-2)] text-xs font-medium uppercase tracking-wider text-[var(--color-faint)]">
              <tr>
                <th className="px-4 py-2.5">Recipient</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-edge)] font-mono">
              {authorizations.map((auth, idx) => (
                <tr key={auth.address} className="hover:bg-[var(--color-panel-2)]/50">
                  <td className="px-4 py-2.5 text-[var(--color-ink)]">
                    {shortAddress(auth.address)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[var(--color-ink)]">
                    {auth.amount}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleCopyLink(auth, idx)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-iris)] hover:underline"
                    >
                      {copiedIndex === idx ? "Copied!" : "Copy link"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center border-t border-[var(--color-edge)] pt-5">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-edge-strong)] px-6 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition-colors duration-150 hover:bg-[var(--color-panel-2)]"
        >
          Create another campaign
        </button>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
