import { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion, useMotionValue, animate } from "framer-motion";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { useUserDecrypt } from "@zama-fhe/react-sdk";
import {
  useGetClaimAmount,
  useClaim,
  useAirdropIsSignatureClaimed,
} from "@tokenops/sdk/fhe-airdrop/react";
import { formatTokens, shortAddress, TOKEN_DECIMALS } from "@/lib/recipients";
import { ConfidentialBalance } from "@/components/ConfidentialBalance";
import { VestingClaim, type VestingPayload } from "@/components/VestingClaim";
import { decodeClaimPayload, isVestingPayload } from "@/lib/claimLink";

// The Zama relayer and Sepolia RPC intermittently time out / fetch-fail. These


const isTransientRelayerError = (msg: string) =>
  /timed out|fetch|relayer|network|ENCRYPT|worker|NODE_INIT|ECONNRESET|ETIMEDOUT/i.test(
    msg,
  );

const LOW_ETH_THRESHOLD = 5_000_000_000_000_000n; 

export function Claim() {
  const { address: connectedAddress, isConnected } = useAccount();

  
  // gas fee), so a recipient with no Sepolia ETH would hit a confusing revert.
  const { data: ethBalance } = useBalance({ address: connectedAddress });
  const isLowEth =
    isConnected && ethBalance !== undefined && ethBalance.value < LOW_ETH_THRESHOLD;

  
  const [campaignAddress, setCampaignAddress] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [plaintextAmount, setPlaintextAmount] = useState("");
  const [encryptedHandle, setEncryptedHandle] = useState<`0x${string}` | "">("");
  const [inputProof, setInputProof] = useState<`0x${string}` | "">("");
  const [signature, setSignature] = useState<`0x${string}` | "">("");
  const [recipientLabel, setRecipientLabel] = useState("");

  
  const [revealHandle, setRevealHandle] = useState<`0x${string}` | "">("");
  const [decryptedAmount, setDecryptedAmount] = useState<bigint | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [showManualImport, setShowManualImport] = useState(false);
  const [pastedJson, setPastedJson] = useState("");

  
  
  const [vestingPayload, setVestingPayload] = useState<VestingPayload | null>(null);

  
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    try {
      // Current format: a single lz-string-compressed payload under `z=`. The
      // value is already URI-safe (alphabet A-Za-z0-9+-$), so extract it with a
      // regex and decode directly — never via URLSearchParams, which would turn
      // `+` into a space and corrupt the payload.
      const zMatch = hash.match(/(?:^|&)z=([^&]+)/);
      if (zMatch) {
        const parsed = decodeClaimPayload(zMatch[1]);
        if (isVestingPayload(parsed)) {
          setVestingPayload(parsed as unknown as VestingPayload);
          window.location.hash = "";
          return;
        }
        if (parsed && (parsed as any).c && (parsed as any).r) {
          const p = parsed as any;
          setCampaignAddress(p.c);
          setRecipientAddress(p.r);
          setPlaintextAmount(p.a);
          setEncryptedHandle(p.h as `0x${string}`);
          setInputProof(p.p as `0x${string}`);
          setSignature(p.s as `0x${string}`);
          if (p.l) setRecipientLabel(p.l);
          window.location.hash = "";
          return;
        }
      }

      // Legacy format: `v=` carried encodeURIComponent'd JSON for vesting links.
      const vMatch = hash.match(/(?:^|&)v=([^&]+)/);
      if (vMatch) {
        const parsed = JSON.parse(decodeURIComponent(vMatch[1]));
        if (parsed && Array.isArray(parsed.t) && parsed.r) {
          setVestingPayload(parsed as VestingPayload);
          window.location.hash = "";
          return;
        }
      }

      // Legacy format: flat `c=&r=&a=&h=&p=&s=&l=` key/value pairs.
      const params = new URLSearchParams(hash);
      const c = params.get("c");
      const r = params.get("r");
      const a = params.get("a");
      const h = params.get("h");
      const p = params.get("p");
      const s = params.get("s");
      const l = params.get("l"); 

      if (c && r && a && h && p && s) {
        setCampaignAddress(c);
        setRecipientAddress(r);
        setPlaintextAmount(a);
        setEncryptedHandle(h as `0x${string}`);
        setInputProof(p as `0x${string}`);
        setSignature(s as `0x${string}`);
        if (l) setRecipientLabel(l);
        window.location.hash = ""; 
      }
    } catch (err) {
      console.error("Failed to parse URL hash parameters", err);
    }
  }, []);

  
  const loadPayload = useCallback(
    (data: any) => {
      setErrorMsg("");
      setSuccessMsg("");
      setDecryptedAmount(null);
      setRevealHandle("");

      try {
        
        if (data?.type === "vesting" && Array.isArray(data.deliveries)) {
          const mine =
            (connectedAddress &&
              data.deliveries.find(
                (d: any) => d.address?.toLowerCase() === connectedAddress.toLowerCase(),
              )) ||
            data.deliveries[0];
          if (mine) {
            setVestingPayload({
              r: mine.address,
              l: mine.label ?? "",
              total: mine.totalAmount,
              t: (mine.tranches ?? []).map((tr: any) => ({
                i: tr.index,
                c: tr.campaignAddress,
                u: tr.unlockTs,
                a: tr.amount,
                h: tr.encryptedInput?.handle ?? tr.h,
                p: tr.encryptedInput?.inputProof ?? tr.p,
                s: tr.signature ?? tr.s,
              })),
            });
            return;
          }
        }

        const campaign = data.campaignAddress;
        let auth = null;

        if (Array.isArray(data.authorizations)) {
          
          if (connectedAddress) {
            auth = data.authorizations.find(
              (x: any) => x.recipient?.toLowerCase() === connectedAddress.toLowerCase()
            );
          }
          
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
        setRecipientLabel(auth.label || "");
      } catch (err) {
        setErrorMsg("Failed to parse JSON file.");
      }
    },
    [connectedAddress]
  );

  
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

  
  const isLoaded = !!campaignAddress && !!encryptedHandle && !!signature;

  const isClaimedQuery = useAirdropIsSignatureClaimed({
    address: campaignAddress as `0x${string}`,
    user: recipientAddress as `0x${string}`,
    encryptedAmountHandle: encryptedHandle || undefined,
  });

  
  const revealMutation = useGetClaimAmount({
    address: campaignAddress as `0x${string}`,
  });

  const claimMutation = useClaim({
    address: campaignAddress as `0x${string}`,
  });

  // Decrypt the granted handle via the Zama relayer. The relayer intermittently
  
  
  const decryptQuery = useUserDecrypt(
    {
      handles: revealHandle
        ? [{ handle: revealHandle, contractAddress: campaignAddress as `0x${string}` }]
        : [],
    },
    {
      enabled: !!revealHandle && !!campaignAddress,
      retry: 4,
      retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 8000),
    }
  );

  useEffect(() => {
    if (!revealHandle || !decryptQuery.data) return;
    const value = decryptQuery.data[revealHandle];
    if (typeof value === "bigint") setDecryptedAmount(value);
  }, [decryptQuery.data, revealHandle]);

  
  useEffect(() => {
    if (!decryptQuery.error) return;
    const msg = decryptQuery.error.message || "";
    setErrorMsg(
      isTransientRelayerError(msg)
        ? "The secure reveal service is unresponsive right now. Wait a moment and try again."
        : msg || "Reveal failed.",
    );
  }, [decryptQuery.error]);

  
  const isDecryptRetrying =
    !!revealHandle && decryptedAmount === null && decryptQuery.failureCount > 0 && decryptQuery.isFetching;

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
      const msg = (err?.message ?? String(err)) + " " + (err?.cause?.message ?? "");
      setErrorMsg(
        isTransientRelayerError(msg)
          ? "The network is slow right now. Wait a moment and click Reveal again."
          : err?.message || "Reveal failed.",
      );
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
          Import your signed authorization payload, reveal the amount privately, and claim.
        </p>
      </div>

      {vestingPayload ? (
        <VestingClaim payload={vestingPayload} onClear={() => setVestingPayload(null)} />
      ) : !isLoaded ? (
        <div className="space-y-4">
          {}
          <div className="rounded-xl border border-edge bg-panel p-6 text-center space-y-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold-dim">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">Open your private claim link</h2>
              <p className="text-sm text-mute mt-1">
                Your sender shared a one-time claim link. Open it and your encrypted
                allocation loads here automatically — nothing to upload.
              </p>
            </div>
          </div>

          {!showManualImport ? (
            <button
              onClick={() => setShowManualImport(true)}
              className="w-full text-center text-xs font-semibold text-faint hover:text-mute"
            >
              Received a payload file instead? Import it manually
            </button>
          ) : (
            <div className="space-y-4 animate-step-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-mute">Manual import (fallback)</span>
                <button
                  onClick={() => setShowManualImport(false)}
                  className="text-xs font-semibold text-faint hover:text-mute"
                >
                  Hide
                </button>
              </div>
          {}
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
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-step-in">
          {}
          <div className="rounded-xl border border-edge bg-panel p-4 sm:p-5 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <span className="text-sm font-semibold text-ink">
                {recipientLabel ? `Allocation for ${recipientLabel}` : "Airdrop Details"}
              </span>
              <button
                onClick={() => {
                  setCampaignAddress("");
                  setRecipientAddress("");
                  setPlaintextAmount("");
                  setEncryptedHandle("");
                  setInputProof("");
                  setSignature("");
                  setRecipientLabel("");
                  setDecryptedAmount(null);
                  setRevealHandle("");
                }}
                className="text-xs font-semibold text-danger text-left sm:text-right hover:underline"
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
              <div className="flex items-center justify-between py-2">
                <span className="text-mute">Your Allocation</span>
                {decryptedAmount === null ? (
                  <span
                    className="font-mono font-medium tracking-widest text-faint select-none"
                    title="Private on-chain — click below to reveal"
                  >
                    •••••• tokens
                  </span>
                ) : (
                  <span className="font-mono font-semibold text-ink">
                    <AmountReveal raw={decryptedAmount} /> tokens
                  </span>
                )}
              </div>
            </div>

            {}
            {decryptedAmount !== null && (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">
                <span className="text-lg">🛡️</span>
                <div>
                  <p className="font-semibold">Securely Verified</p>
                  <p className="text-xs opacity-90">
                    Your private allocation is {formatTokens(decryptedAmount)} tokens
                    {plaintextAmount ? " — matching the amount your sender committed" : ""}.
                  </p>
                </div>
              </div>
            )}
          </div>

          {}
          <div className="rounded-2xl border border-edge bg-panel p-4 sm:p-6 space-y-5">
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
                {/* Low gas warning — claiming needs Sepolia ETH for the tx + fee. */}
                {isLowEth && (
                  <div className="rounded-lg border border-gold/40 bg-gold-tint/40 p-3 text-xs text-gold-dim">
                    Low on Sepolia ETH (
                    <span className="font-mono">
                      {Number(formatEther(ethBalance!.value)).toFixed(4)} ETH
                    </span>
                    ). Claiming sends an on-chain transaction with an attached gas
                    fee — top up a little testnet ETH first, or the claim may fail
                    with “insufficient funds.”
                  </div>
                )}

                {}
                {decryptedAmount === null && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-ink">
                      1. Securely Reveal Amount
                    </h3>
                    <p className="text-xs text-mute">
                      Triggers a secure request to reveal your allocation. You will approve a signature in your wallet to view the amount privately.
                    </p>
                    <button
                      onClick={handleReveal}
                      disabled={isRevealing}
                      className="w-full rounded-lg border border-gold/40 bg-gold/5 py-2.5 text-sm font-semibold text-gold-dim transition-all hover:bg-gold/10 disabled:opacity-60"
                    >
                      {isDecryptRetrying
                        ? `Secure service slow — retrying (${decryptQuery.failureCount})…`
                        : isRevealing
                          ? "Revealing allocation…"
                          : "Reveal Allocation"}
                    </button>
                  </div>
                )}

                {}
                <div className="space-y-2.5 pt-3 border-t border-edge">
                  <h3 className="text-sm font-semibold text-ink">
                    2. Claim Tokens
                  </h3>
                  <p className="text-xs text-mute">
                    {decryptedAmount === null
                      ? "Reveal your allocation above to unlock claiming."
                      : "Consumes your claim signature and transfers the tokens directly to your wallet."}
                  </p>
                  <button
                    onClick={handleClaim}
                    disabled={claimMutation.isPending || decryptedAmount === null}
                    className="w-full rounded-lg bg-iris py-2.5 text-sm font-semibold text-white transition-all hover:bg-iris-dim disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {claimMutation.isPending
                      ? "Claiming..."
                      : decryptedAmount === null
                        ? "Reveal to unlock"
                        : "Claim Allocation"}
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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 break-all">
          {successMsg}
        </div>
      )}

      {}
      {isConnected && (
        <div className="border-t border-edge pt-6">
          <ConfidentialBalance />
        </div>
      )}
    </div>
  );
}

/* *
 * AmountReveal — animates a confidential allocation from 0 up to its decrypted
 * value, turning the FHE decrypt into the visible "reveal" moment. Honors the
 * user's reduced-motion preference by snapping straight to the final value. */
function AmountReveal({ raw }: { raw: bigint }) {
  const reduceMotion = useReducedMotion();
  const target = Number(raw) / 10 ** TOKEN_DECIMALS;
  const mv = useMotionValue(reduceMotion ? target : 0);
  const [display, setDisplay] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(target);
      return;
    }
    const controls = animate(mv, target, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [mv, target, reduceMotion]);

  
  const isSettled = Math.abs(display - target) < 0.5;
  const text = isSettled
    ? formatTokens(raw)
    : display.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <motion.span
      initial={reduceMotion ? false : { opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {text}
    </motion.span>
  );
}
