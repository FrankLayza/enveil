import { useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { shortAddress, recipientNoun, type CampaignType, type Recipient } from "@/lib/recipients";
import { type VestingRecipientDelivery, formatUnlockDate } from "@/lib/vesting";
import { buildClaimLink } from "@/lib/claimLink";

interface StepDeliverProps {
  tokenAddress: string;
  campaignAddress: string;
  campaignName?: string;
  recipients?: Recipient[];
  authorizations: Array<{
    address: string;
    amount: string;
    label?: string;
    encryptedInput: { handle: string; inputProof: string };
    signature: string;
  }>;
  campaignType: CampaignType;
  /** Vesting deliveries (if campaign is vesting type). */
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

  /* ── Per-recipient link builders ────────────────────────────────── */

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
    navigator.clipboard.writeText(getClaimLink(auth));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  /* ── CSV / JSON export ──────────────────────────────────────────── */

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
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
    const data = { type: "vesting", tokenAddress, deliveries: vestingDeliveries };
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

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="animate-step-in space-y-6">

      {/* ── Confetti hero header ──────────────────────────────────── */}
      <div className="text-center py-4 flex flex-col items-center gap-1">
        <div className="w-32 h-32 -mb-2">
          <DotLottieReact
            src="/Confetti Check.lottie"
            autoplay
            loop={false}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Campaign Live!
        </h2>
        <p className="text-sm text-ink/60 mt-1 max-w-md mx-auto">
          Your campaign has been deployed, funded, and recipient payloads are authorized.
        </p>
      </div>

      {/* ── Campaign summary ──────────────────────────────────────── */}
      <div className="rounded-xl border border-edge bg-panel-2 p-5 space-y-4 text-sm shadow-xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-0">
          <span className="text-ink/60 font-medium">Campaign Address</span>
          <span className="font-mono font-medium text-ink hidden sm:inline break-all bg-panel px-2 py-0.5 rounded-md border border-edge">
            {campaignAddress}
          </span>
          <span className="font-mono font-medium text-ink sm:hidden bg-panel px-2 py-0.5 rounded-md border border-edge">
            {shortAddress(campaignAddress)}
          </span>
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

      {/* ── Export actions ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={isVesting ? handleCopyAllVestingCsv : handleCopyAllCsv}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-edge bg-panel px-5 py-3 text-sm font-bold text-ink transition-all duration-150 hover:bg-panel-2 shadow-xs"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          {copiedAll ? "Copied all links!" : "Copy all as CSV"}
        </button>
        <button
          onClick={isVesting ? handleDownloadVestingJson : handleDownloadJson}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold shadow-md transition-all duration-200 hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
        >
          <DownloadIcon /> Download Campaign File
        </button>
      </div>

      {/* ── Per-recipient links table ─────────────────────────────── */}
      <div className="rounded-xl border border-edge bg-panel shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">Claim links</h3>
            <p className="text-xs text-ink/50 mt-0.5">
              Send each {noun} their personal link — it carries their private allocation and loads automatically.
            </p>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[380px]">
            <thead className="bg-panel-2 text-[11px] font-bold uppercase tracking-widest text-ink/50 border-b border-edge sticky top-0">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">{noun}</th>
                <th className="px-4 py-3 text-right">{isVesting ? "Total" : "Amount"}</th>
                {isVesting && <th className="px-4 py-3 text-right">Unlocks</th>}
                <th className="px-4 py-3 text-right">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60 font-mono text-sm">
              {isVesting
                ? vestingDeliveries!.map((d, idx) => (
                    <tr key={d.address} className="transition-colors hover:bg-panel-2/50">
                      <td className="px-4 py-3 font-sans text-ink">
                        {d.label ? d.label : <span className="text-ink/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-ink">{shortAddress(d.address)}</td>
                      <td className="px-4 py-3 text-right text-ink font-semibold">{d.totalAmount}</td>
                      <td
                        className="px-4 py-3 text-right text-ink/60"
                        title={d.tranches.map((t) => formatUnlockDate(t.unlockTs)).join(", ")}
                      >
                        {d.tranches.length}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getVestingClaimLink(d));
                            setCopiedIndex(idx);
                            setTimeout(() => setCopiedIndex(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ color: "var(--card-accent)" }}
                        >
                          {copiedIndex === idx ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                              Copied!
                            </>
                          ) : "Copy link"}
                        </button>
                      </td>
                    </tr>
                  ))
                : authorizations.map((auth, idx) => (
                    <tr key={auth.address} className="transition-colors hover:bg-panel-2/50">
                      <td className="px-4 py-3 font-sans text-ink">
                        {auth.label ? auth.label : <span className="text-ink/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-ink">{shortAddress(auth.address)}</td>
                      <td className="px-4 py-3 text-right text-ink font-semibold">{auth.amount}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleCopyLink(auth, idx)}
                          className="inline-flex items-center gap-1 text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ color: "var(--card-accent)" }}
                        >
                          {copiedIndex === idx ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                              Copied!
                            </>
                          ) : "Copy link"}
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Reset ─────────────────────────────────────────────────── */}
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
