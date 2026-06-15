import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useUserDecrypt } from "@zama-fhe/react-sdk";
import {
  useGetClaimAmount,
  useClaim,
  useAirdropIsSignatureClaimed,
} from "@tokenops/sdk/fhe-airdrop/react";
import { formatTokens, shortAddress } from "@/lib/recipients";
import { ConfidentialBalance } from "@/components/ConfidentialBalance";

export function Claim() {
  const { address: connectedAddress, isConnected } = useAccount();

  // Payload inputs
  const [campaignAddress, setCampaignAddress] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [plaintextAmount, setPlaintextAmount] = useState("");
  const [encryptedHandle, setEncryptedHandle] = useState<`0x${string}` | "">("");
  const [inputProof, setInputProof] = useState<`0x${string}` | "">("");
  const [signature, setSignature] = useState<`0x${string}` | "">("");

  // Process / verify states
  const [revealHandle, setRevealHandle] = useState<`0x${string}` | "">("");
  const [decryptedAmount, setDecryptedAmount] = useState<bigint | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [pastedJson, setPastedJson] = useState("");

  // 1) Parse parameters from URL hash if present
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    try {
      const params = new URLSearchParams(hash);
      const c = params.get("c");
      const r = params.get("r");
      const a = params.get("a");
      const h = params.get("h");
      const p = params.get("p");
      const s = params.get("s");

      if (c && r && a && h && p && s) {
        setCampaignAddress(c);
        setRecipientAddress(r);
        setPlaintextAmount(a);
        setEncryptedHandle(h as `0x${string}`);
        setInputProof(p as `0x${string}`);
        setSignature(s as `0x${string}`);
        window.location.hash = ""; // Clear hash to keep URL clean
      }
    } catch (err) {
      console.error("Failed to parse URL hash parameters", err);
    }
  }, []);

  // Helper to load parsed JSON
  const loadPayload = useCallback(
    (data: any) => {
      setErrorMsg("");
      setSuccessMsg("");
      setDecryptedAmount(null);
      setRevealHandle("");

      try {
        const campaign = data.campaignAddress;
        let auth = null;

        if (Array.isArray(data.authorizations)) {
          // If multiple, try to find one for the connected account
          if (connectedAddress) {
            auth = data.authorizations.find(
              (x: any) => x.recipient?.toLowerCase() === connectedAddress.toLowerCase()
            );
          }
          // Default to first if none matched
          if (!auth) auth = data.authorizations[0];
        } else if (data.recipient && data.signature) {
          auth = data;
        }

        if (!campaign || !auth) {
          setErrorMsg("Invalid payload structure. Missing campaign or authorization data.");
          return;
        }

        setCampaignAddress(campaign);
        setRecipientAddress(auth.recipient || auth.address);
        setPlaintextAmount(auth.amount);
        setEncryptedHandle(auth.encryptedInput?.handle || auth.handle);
        setInputProof(auth.encryptedInput?.inputProof || auth.inputProof || auth.proof);
        setSignature(auth.signature || auth.sig);
      } catch (err) {
        setErrorMsg("Failed to parse JSON file.");
      }
    },
    [connectedAddress]
  );

  // Drag and drop handler
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        file.text().then((text) => {
          try {
            const parsed = JSON.parse(text);
            loadPayload(parsed);
          } catch {
            setErrorMsg("Uploaded file is not a valid JSON.");
          }
        });
      }
    },
    [loadPayload]
  );

  const handlePasteSubmit = () => {
    try {
      const parsed = JSON.parse(pastedJson);
      loadPayload(parsed);
      setShowJsonInput(false);
      setPastedJson("");
    } catch {
      setErrorMsg("Pasted text is not valid JSON.");
    }
  };

  // Queries for status checking
  const isLoaded = !!campaignAddress && !!encryptedHandle && !!signature;

  const isClaimedQuery = useAirdropIsSignatureClaimed({
    address: campaignAddress as `0x${string}`,
    user: recipientAddress as `0x${string}`,
    encryptedAmountHandle: encryptedHandle || undefined,
  });

  // Mutations
  const revealMutation = useGetClaimAmount({
    address: campaignAddress as `0x${string}`,
  });

  const claimMutation = useClaim({
    address: campaignAddress as `0x${string}`,
  });

  // Decrypt the granted handle via the Zama relayer
  const decryptQuery = useUserDecrypt(
    {
      handles: revealHandle
        ? [{ handle: revealHandle, contractAddress: campaignAddress as `0x${string}` }]
        : [],
    },
    { enabled: !!revealHandle && !!campaignAddress }
  );

  useEffect(() => {
    if (!revealHandle || !decryptQuery.data) return;
    const value = decryptQuery.data[revealHandle];
    if (typeof value === "bigint") setDecryptedAmount(value);
  }, [decryptQuery.data, revealHandle]);

  const isRevealing =
    revealMutation.isPending || (!!revealHandle && decryptedAmount === null && decryptQuery.isFetching);

  const handleReveal = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const result = await revealMutation.mutateAsync({
        encryptedInput: {
          handle: encryptedHandle as `0x${string}`,
          inputProof: inputProof as `0x${string}`,
        },
        signature: signature as `0x${string}`,
      });
      setRevealHandle(result.handle);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Reveal failed.");
    }
  };

  const handleClaim = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const hash = await claimMutation.mutateAsync({
        encryptedInput: {
          handle: encryptedHandle as `0x${string}`,
          inputProof: inputProof as `0x${string}`,
        },
        signature: signature as `0x${string}`,
      });

      setSuccessMsg(`Tokens claimed successfully! Tx hash: ${hash}`);
      isClaimedQuery.refetch();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Claim transaction failed.");
    }
  };

  const addressMismatch =
    isConnected &&
    connectedAddress &&
    recipientAddress &&
    connectedAddress.toLowerCase() !== recipientAddress.toLowerCase();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Claim your tokens
        </h1>
        <p className="text-sm text-mute mt-1">
          Import your signed authorization payload, decrypt to verify the amount privately, and claim.
        </p>
      </div>

      {!isLoaded ? (
        <div className="space-y-4">
          {/* Dropzone */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors duration-155 " +
              (dragging
                ? "border-gold bg-gold/5"
                : "border-edge-strong hover:border-gold/60 hover:bg-panel-2")
            }
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-mute)"
              strokeWidth="1.5"
              className="mb-3"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <p className="text-base font-semibold text-ink">
              Drop your claim JSON file here
            </p>
            <p className="text-xs text-mute mt-1">
              or click to upload the JSON payload
            </p>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  f.text().then((text) => {
                    try {
                      loadPayload(JSON.parse(text));
                    } catch {
                      setErrorMsg("Invalid JSON file.");
                    }
                  });
                }
                e.target.value = "";
              }}
            />
          </label>

          <div className="text-center text-xs text-faint">— OR —</div>

          {!showJsonInput ? (
            <button
              onClick={() => setShowJsonInput(true)}
              className="w-full py-2.5 rounded-lg border border-edge-strong text-sm font-semibold text-mute hover:bg-panel-2/60 hover:text-ink"
            >
              Paste JSON payload text
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='Paste {"campaignAddress": "0x...", "authorizations": [...] } here'
                className="w-full h-32 rounded-lg border border-edge-strong bg-transparent p-3 text-xs font-mono focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowJsonInput(false)}
                  className="flex-1 py-2 rounded-lg border border-edge-strong text-xs font-semibold text-mute hover:bg-panel-2/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteSubmit}
                  className="flex-1 py-2 rounded-lg bg-iris text-xs font-semibold text-white hover:bg-iris-dim"
                >
                  Import JSON
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-step-in">
          {/* Loaded details */}
          <div className="rounded-xl border border-edge bg-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Airdrop Details</span>
              <button
                onClick={() => {
                  setCampaignAddress("");
                  setRecipientAddress("");
                  setPlaintextAmount("");
                  setEncryptedHandle("");
                  setInputProof("");
                  setSignature("");
                  setDecryptedAmount(null);
                  setRevealHandle("");
                }}
                className="text-xs font-semibold text-danger hover:underline"
              >
                Clear / Import another
              </button>
            </div>

            <div className="divide-y divide-edge text-sm">
              <div className="flex justify-between py-2">
                <span className="text-mute">Campaign</span>
                <span className="font-mono text-xs text-ink">
                  {shortAddress(campaignAddress)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-mute">Recipient</span>
                <span className="font-mono text-xs text-ink">
                  {shortAddress(recipientAddress)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-mute">Expected Amount</span>
                <span className="font-mono font-medium text-ink">
                  {plaintextAmount} tokens
                </span>
              </div>
            </div>

            {/* Verification status */}
            {decryptedAmount !== null && (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">
                <span className="text-lg">🛡️</span>
                <div>
                  <p className="font-semibold">Cryptographically Verified</p>
                  <p className="text-xs opacity-90">
                    Decrypted allocation on-chain matches the expected{" "}
                    {formatTokens(decryptedAmount)} tokens.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Verification & Claim actions */}
          <div className="rounded-2xl border border-edge bg-panel p-6 space-y-5">
            {!isConnected ? (
              <div className="text-center py-6 text-sm text-mute">
                Connect your wallet to check eligibility and claim.
              </div>
            ) : addressMismatch ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-danger space-y-2">
                <p className="font-semibold">Recipient address mismatch</p>
                <p>
                  Your connected address ({shortAddress(connectedAddress)}) does not match the
                  designated recipient address ({shortAddress(recipientAddress)}). Please switch to the correct account in your wallet.
                </p>
              </div>
            ) : isClaimedQuery.data === true ? (
              <div className="text-center py-6 space-y-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <h3 className="font-semibold text-base text-ink">
                  Allocation already claimed
                </h3>
                <p className="text-xs text-mute">
                  The tokens for this signature have already been claimed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Reveal & Decrypt */}
                {decryptedAmount === null && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-ink">
                      1. Cryptographically Verify Amount
                    </h3>
                    <p className="text-xs text-mute">
                      Triggers a transaction to authorize decyption of your FHE ciphertext. You then sign a relayer request to decrypt the amount locally.
                    </p>
                    <button
                      onClick={handleReveal}
                      disabled={isRevealing}
                      className="w-full rounded-lg border border-gold/40 bg-gold/5 py-2.5 text-sm font-semibold text-gold-dim transition-all hover:bg-gold/10"
                    >
                      {isRevealing
                        ? "Revealing and Decrypting FHE..."
                        : "Decrypt & Verify Allocation"}
                    </button>
                  </div>
                )}

                {/* Claim */}
                <div className="space-y-2.5 pt-3 border-t border-edge">
                  <h3 className="text-sm font-semibold text-ink">
                    {decryptedAmount !== null ? "Claim Tokens" : "2. Claim Tokens"}
                  </h3>
                  <p className="text-xs text-mute">
                    Consumes your claim signature and transfers the encrypted tokens directly to your wallet.
                  </p>
                  <button
                    onClick={handleClaim}
                    disabled={claimMutation.isPending}
                    className="w-full rounded-lg bg-iris py-2.5 text-sm font-semibold text-white transition-all hover:bg-iris-dim disabled:opacity-50"
                  >
                    {claimMutation.isPending ? "Claiming..." : "Claim Allocation"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-danger">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
          {successMsg}
        </div>
      )}

      {/* Balance is decoupled from the claim flow — a recipient can check their
          confidential balance any time their wallet is connected, with no payload.
          A confidential balance can't show in any wallet; you decrypt it here. */}
      {isConnected && (
        <div className="border-t border-edge pt-6">
          <ConfidentialBalance />
        </div>
      )}
    </div>
  );
}
