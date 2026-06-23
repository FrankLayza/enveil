import { useState } from "react";
import { shortAddress, recipientNoun, type CampaignType } from "@/lib/recipients";
import { type VestingRecipientDelivery, formatUnlockDate } from "@/lib/vesting";
import { buildClaimLink } from "@/lib/claimLink";

interface StepDeliverProps {
  tokenAddress: string;
  campaignAddress: string;
  authorizations: Array<{
    address: string;
    amount: string;
    label?: string;
    encryptedInput: { handle: string; inputProof: string };
    signature: string;
  }>;
  campaignType: CampaignType;
  
  vestingDeliveries?: VestingRecipientDelivery[];
  onReset: () => void;
}

export function StepDeliver({
  tokenAddress,
  campaignAddress,
  authorizations,
  campaignType,
  vestingDeliveries,
  onReset,
}: StepDeliverProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const noun = recipientNoun(campaignType);
  const isVesting = !!vestingDeliveries && vestingDeliveries.length > 0;

  
  
  
  const getVestingClaimLink = (d: VestingRecipientDelivery) =>
    buildClaimLink(window.location.origin, {
      r: d.address,
      l: d.label ?? "",
      total: d.totalAmount,
      t: d.tranches.map((tr) => ({
        i: tr.index,
        c: tr.campaignAddress,
        u: tr.unlockTs,
        a: tr.amount,
        h: tr.encryptedInput.handle,
        p: tr.encryptedInput.inputProof,
        s: tr.signature,
      })),
    });

  const getClaimLink = (auth: (typeof authorizations)[0]) =>
    buildClaimLink(window.location.origin, {
      c: campaignAddress,
      r: auth.address,
      a: auth.amount,
      h: auth.encryptedInput.handle,
      p: auth.encryptedInput.inputProof,
      s: auth.signature,
      ...(auth.label ? { l: auth.label } : {}),
    });

  const handleCopyLink = (auth: (typeof authorizations)[0], index: number) => {
    const link = getClaimLink(auth);
    navigator.clipboard.writeText(link);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  
  const csvEscape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const handleCopyAllCsv = () => {
    const header = "label,address,amount,claimLink";
    const rows = authorizations.map((auth) =>
      [auth.label ?? "", auth.address, auth.amount, getClaimLink(auth)]
        .map((c) => csvEscape(String(c)))
        .join(",")
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadJson = () => {
    const data = {
      campaignAddress,
      tokenAddress,
      authorizations: authorizations.map((auth) => ({
        recipient: auth.address,
        amount: auth.amount,
        label: auth.label ?? "",
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
    a.download = `enveil-airdrop-${campaignAddress.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyAllVestingCsv = () => {
    const header = "label,address,total,unlocks,claimLink";
    const rows = (vestingDeliveries ?? []).map((d) =>
      [d.label ?? "", d.address, d.totalAmount, String(d.tranches.length), getVestingClaimLink(d)]
        .map((c) => csvEscape(String(c)))
        .join(","),
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadVestingJson = () => {
    const data = {
      type: "vesting",
      tokenAddress,
      deliveries: vestingDeliveries,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enveil-vesting-${(campaignAddress || "campaign").slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-step-in space-y-6">
      <div className="text-center py-6">
        <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-panel border border-edge shadow-sm text-success-text">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Campaign Live!
        </h2>
        <p className="text-sm text-ink/60 mt-2 max-w-md mx-auto">
          Your campaign clone has been deployed, funded, and recipient payloads are authorized.
        </p>
      </div>

      <div className="rounded-xl border border-edge bg-panel-2 p-5 space-y-4 text-sm shadow-xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-0">
          <span className="text-ink/60 font-medium">Campaign Address</span>
          <span className="font-mono font-medium text-ink hidden sm:inline break-all bg-panel px-2 py-0.5 rounded-md border border-edge">{campaignAddress}</span>
          <span className="font-mono font-medium text-ink sm:hidden bg-panel px-2 py-0.5 rounded-md border border-edge">{shortAddress(campaignAddress)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ink/60 font-medium">Total {isVesting ? "grantees" : "Recipients"}</span>
          <span className="font-mono font-bold text-lg" style={{ color: "var(--card-accent)" }}>
            {isVesting ? vestingDeliveries!.length : authorizations.length}
          </span>
        </div>
        {isVesting && (
          <div className="flex justify-between items-center">
            <span className="text-ink/60 font-medium">Unlocks per grantee</span>
            <span className="font-mono font-bold text-lg" style={{ color: "var(--card-accent)" }}>
              {vestingDeliveries![0]?.tranches.length ?? 0}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Deliver allocations</h3>
          <p className="text-xs text-ink/60 mt-1">
            {isVesting
              ? `Each link carries the grantee's full unlock schedule — amounts stay encrypted. Share one link per ${noun}; tranches unlock automatically on their dates.`
              : "Amounts are private and never go on-chain. Share each private claim link with the matching " + noun + " — they open it to reveal and claim."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={isVesting ? handleCopyAllVestingCsv : handleCopyAllCsv}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold shadow-md transition-all duration-200 hover:-translate-y-0.5"
            style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
          >
            {copiedAll ? "Copied all links!" : "Copy all as CSV"}
          </button>
          <button
            onClick={isVesting ? handleDownloadVestingJson : handleDownloadJson}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-edge bg-panel px-5 py-3.5 text-sm font-bold text-ink transition-all duration-150 hover:bg-panel-2 shadow-xs"
          >
            <DownloadIcon /> Download JSON
          </button>
        </div>

        {/* Links list */}
        <div className="rounded-xl border border-edge bg-panel shadow-sm max-h-60 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[380px]">
            <thead className="bg-panel-2 text-[11px] font-bold uppercase tracking-widest text-ink/50 border-b border-edge">
              <tr>
                <th className="px-3 sm:px-4 py-3">Label</th>
                <th className="px-3 sm:px-4 py-3">{noun}</th>
                <th className="px-3 sm:px-4 py-3 text-right">{isVesting ? "Total" : "Amount"}</th>
                {isVesting && <th className="px-3 sm:px-4 py-3 text-right">Unlocks</th>}
                <th className="px-3 sm:px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60 font-mono text-sm">
              {isVesting
                ? vestingDeliveries!.map((d, idx) => (
                    <tr key={d.address} className="transition-colors hover:bg-panel-2/50">
                      <td className="px-3 sm:px-4 py-3 font-sans text-ink">
                        {d.label ? d.label : <span className="text-ink/30">—</span>}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-ink">{shortAddress(d.address)}</td>
                      <td className="px-3 sm:px-4 py-3 text-right text-ink font-semibold">{d.totalAmount}</td>
                      <td className="px-3 sm:px-4 py-3 text-right text-ink/60" title={d.tranches.map((t) => formatUnlockDate(t.unlockTs)).join(", ")}>
                        {d.tranches.length}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getVestingClaimLink(d));
                            setCopiedIndex(idx);
                            setTimeout(() => setCopiedIndex(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ color: "var(--card-accent)" }}
                        >
                          {copiedIndex === idx ? "Copied!" : "Copy link"}
                        </button>
                      </td>
                    </tr>
                  ))
                : authorizations.map((auth, idx) => (
                    <tr key={auth.address} className="transition-colors hover:bg-panel-2/50">
                      <td className="px-3 sm:px-4 py-3 font-sans text-ink">
                        {auth.label ? auth.label : <span className="text-ink/30">—</span>}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-ink">{shortAddress(auth.address)}</td>
                      <td className="px-3 sm:px-4 py-3 text-right text-ink font-semibold">{auth.amount}</td>
                      <td className="px-3 sm:px-4 py-3 text-right">
                        <button
                          onClick={() => handleCopyLink(auth, idx)}
                          className="inline-flex items-center gap-1 text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ color: "var(--card-accent)" }}
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

      <div className="flex items-center justify-center border-t border-edge pt-8 mt-8">
        <button
          onClick={onReset}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-edge bg-panel px-8 py-3 text-sm font-bold text-ink transition-all duration-150 hover:bg-panel-2"
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
