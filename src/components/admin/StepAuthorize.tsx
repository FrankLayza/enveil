import { useState } from "react";
import { useAccount } from "wagmi";
import { useZamaSDK } from "@zama-fhe/react-sdk";
import { encryptUint64, useSignClaimAuthorization } from "@tokenops/sdk/fhe-airdrop/react";
import { type Recipient, toRawUnits, shortAddress } from "@/lib/recipients";

interface StepAuthorizeProps {
  campaignAddress: string;
  recipients: Recipient[];
  onSuccess: (
    auths: Array<{
      address: string;
      amount: string;
      label?: string;
      encryptedInput: { handle: string; inputProof: string };
      signature: string;
    }>
  ) => void;
  onBack: () => void;
}

export function StepAuthorize({
  campaignAddress,
  recipients,
  onSuccess,
  onBack,
}: StepAuthorizeProps) {
  const { isConnected } = useAccount();
  const zamaSDK = useZamaSDK();
  const signMutation = useSignClaimAuthorization();

  const [statuses, setStatuses] = useState<
    Record<string, "pending" | "encrypting" | "signing" | "done" | "failed">
  >(() => {
    const init: Record<string, "pending"> = {};
    for (const r of recipients) {
      init[r.id] = "pending";
    }
    return init;
  });

  const [progressText, setProgressText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [completedAuths, setCompletedAuths] = useState<
    Array<{
      address: string;
      amount: string;
      label?: string;
      encryptedInput: { handle: string; inputProof: string };
      signature: string;
    }>
  >([]);

  const startAuthorizations = async () => {
    setErrorMsg("");
    setIsRunning(true);
    const newStatuses = { ...statuses };
    const tempAuths = [...completedAuths];

    // Find the first recipient that is not yet completed
    const startIndex = recipients.findIndex(
      (r) => statuses[r.id] !== "done"
    );

    for (let i = startIndex >= 0 ? startIndex : 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      setProgressText(`Processing recipient ${i + 1} of ${recipients.length}...`);

      try {
        // Step 1: Encrypt
        newStatuses[recipient.id] = "encrypting";
        setStatuses({ ...newStatuses });
        const rawUnits = toRawUnits(recipient.amount);

        const encrypted = await encryptUint64({
          encryptor: zamaSDK.relayer,
          contractAddress: campaignAddress as `0x${string}`,
          userAddress: recipient.address as `0x${string}`,
          value: rawUnits,
        });

        // Step 2: Sign
        newStatuses[recipient.id] = "signing";
        setStatuses({ ...newStatuses });

        const signature = await signMutation.mutateAsync({
          airdropAddress: campaignAddress as `0x${string}`,
          recipient: recipient.address as `0x${string}`,
          encryptedAmountHandle: encrypted.handle,
        });

        // Success
        newStatuses[recipient.id] = "done";
        setStatuses({ ...newStatuses });

        tempAuths.push({
          address: recipient.address,
          amount: recipient.amount,
          label: recipient.label,
          encryptedInput: {
            handle: encrypted.handle,
            inputProof: encrypted.inputProof,
          },
          signature,
        });
        setCompletedAuths([...tempAuths]);
      } catch (err: any) {
        console.error(`Failed at recipient ${recipient.address}`, err);
        newStatuses[recipient.id] = "failed";
        setStatuses({ ...newStatuses });
        const msg = (err?.message ?? String(err)) + " " + (err?.cause?.message ?? "");
        const transient = /timed out|fetch|relayer|network|ENCRYPT|worker|ECONNRESET|ETIMEDOUT/i.test(msg);
        setErrorMsg(
          transient
            ? `The Zama relayer stalled on ${shortAddress(recipient.address)}. Already-done recipients are saved — click “Resume authorizations” to continue.`
            : err?.message ||
                `Failed to authorize recipient ${shortAddress(recipient.address)}. Please try again.`,
        );
        setIsRunning(false);
        return;
      }
    }

    setIsRunning(false);
    setProgressText("All authorized successfully!");
    onSuccess(tempAuths);
  };

  const completedCount = Object.values(statuses).filter((s) => s === "done").length;
  const isFinished = completedCount === recipients.length;

  return (
    <div className="animate-step-in space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Authorize recipients
        </h2>
        <p className="text-sm text-mute">
          Generate an encrypted allocation handle bound to each recipient's wallet address, and sign the EIP-712 authorization off-chain.
        </p>
      </div>

      {/* Progress summary */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-ink/70">
            <span className="font-mono text-ink">{completedCount}</span> of{" "}
            <span className="font-mono text-ink">{recipients.length}</span> authorized
          </span>
          {isRunning && <span className="font-bold" style={{ color: "var(--card-accent)" }}>working…</span>}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-edge bg-panel-2 shadow-xs">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              backgroundColor: "var(--card-accent)",
              width: recipients.length ? `${(completedCount / recipients.length) * 100}%` : "0%",
            }}
          />
        </div>
      </div>

      {/* Recipient Status Table */}
      <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-xl border border-edge bg-panel shadow-sm">
        <table className="w-full text-left text-sm min-w-[340px]">
          <thead className="bg-panel-2 text-[11px] font-bold uppercase tracking-widest text-ink/50 border-b border-edge">
            <tr>
              <th className="px-3 sm:px-4 py-3">Address</th>
              <th className="px-3 sm:px-4 py-3 text-right">Amount</th>
              <th className="px-3 sm:px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60 font-mono text-sm">
            {recipients.map((r) => {
              const status = statuses[r.id];
              return (
                <tr key={r.id} className="transition-colors hover:bg-panel-2/50">
                  <td className="px-3 sm:px-4 py-3 text-ink">
                    {shortAddress(r.address)}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right text-ink font-semibold">
                    {r.amount}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right text-xs">
                    {status === "pending" && (
                      <span className="text-ink/40 font-medium">Pending</span>
                    )}
                    {status === "encrypting" && (
                      <span className="font-bold animate-pulse" style={{ color: "var(--card-accent)" }}>
                        Encrypting...
                      </span>
                    )}
                    {status === "signing" && (
                      <span className="text-warning-text font-medium animate-pulse">
                        Sign in wallet...
                      </span>
                    )}
                    {status === "done" && (
                      <span className="inline-flex items-center justify-end gap-1 font-medium text-success-text">
                        <MiniCheck /> Ready
                      </span>
                    )}
                    {status === "failed" && (
                      <span className="inline-flex items-center justify-end gap-1 font-medium text-danger">
                        <MiniX /> Failed
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {progressText && (
        <p className="text-center text-sm font-bold" style={{ color: "var(--card-accent)" }}>
          {progressText}
        </p>
      )}

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-[14px] border border-danger/20 bg-danger/10 p-4 text-sm text-danger shadow-inner">
          <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <p className="font-semibold mb-0.5">Authorization failed</p>
            <p className="text-danger/80">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-edge pt-6 mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <button
          onClick={onBack}
          disabled={isRunning}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-edge bg-panel px-6 py-3 text-sm font-medium text-ink transition-all duration-150 hover:bg-panel-2 disabled:opacity-50"
        >
          ← Back
        </button>

        {!isFinished && (
          <button
            onClick={startAuthorizations}
            disabled={isRunning || !isConnected}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 hover:-translate-y-0.5"
            style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
          >
            {isRunning
              ? "Processing..."
              : completedCount > 0
              ? "Resume authorizations"
              : "Authorize all"}
          </button>
        )}
      </div>
    </div>
  );
}

function MiniCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function MiniX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
