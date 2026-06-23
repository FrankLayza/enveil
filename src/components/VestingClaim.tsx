import { useState, useEffect } from "react";
import { motion, useReducedMotion, useMotionValue, animate } from "framer-motion";
import { useAccount } from "wagmi";
import { useUserDecrypt } from "@zama-fhe/react-sdk";
import {
  useGetClaimAmount,
  useClaim,
  useAirdropIsSignatureClaimed,
} from "@tokenops/sdk/fhe-airdrop/react";
import { formatTokens, shortAddress, toRawUnits, TOKEN_DECIMALS } from "@/lib/recipients";
import { formatUnlockDate, isTrancheUnlocked } from "@/lib/vesting";

const isTransientRelayerError = (msg: string) =>
  /timed out|fetch|relayer|network|ENCRYPT|worker|NODE_INIT|ECONNRESET|ETIMEDOUT/i.test(msg);

export interface ParsedTranche {
  i: number;
  c: string; // tranche airdrop address
  u: number; // unlock unix seconds
  a: string; // whole-token amount (integrity reference)
  h: string; // encrypted handle
  p: string; // input proof
  s: string; // signature
}

export interface VestingPayload {
  r: string; // recipient
  l: string; // label
  total: string;
  t: ParsedTranche[];
}

/**
 * VestingClaim — recipient view of a confidential vesting schedule. Renders a
 * timeline of dated tranches; each unlocked tranche can be independently
 * verified (FHE decrypt) and claimed. Locked tranches show their unlock date.
 */
export function VestingClaim({
  payload,
  onClear,
}: {
  payload: VestingPayload;
  onClear: () => void;
}) {
  const { address: connectedAddress, isConnected } = useAccount();
  const tranches = [...payload.t].sort((a, b) => a.i - b.i);
  const unlockedCount = tranches.filter((t) => isTrancheUnlocked(t.u)).length;

  const addressMismatch =
    isConnected &&
    connectedAddress &&
    connectedAddress.toLowerCase() !== payload.r.toLowerCase();

  return (
    <div className="space-y-6 animate-step-in">
      {/* Header card */}
      <div className="rounded-2xl border border-edge bg-panel p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              Vesting schedule
            </span>
            <h2 className="mt-2 text-lg font-semibold text-ink">
              {payload.l ? `Vesting for ${payload.l}` : "Your vesting schedule"}
            </h2>
            <p className="text-xs text-mute mt-0.5">
              {tranches.length} private unlocks · {unlockedCount} available now
            </p>
          </div>
          <button onClick={onClear} className="shrink-0 text-xs font-semibold text-danger hover:underline">
            Clear
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-edge bg-panel-2 px-4 py-3">
          <span className="text-sm text-mute">Total grant</span>
          <span className="font-mono font-semibold text-ink">{payload.total} tokens</span>
        </div>

        {addressMismatch && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-danger">
            <p className="font-semibold">Wrong wallet connected</p>
            <p className="mt-0.5">
              Connect {shortAddress(payload.r)} to verify and claim these unlocks.
            </p>
          </div>
        )}
        {!isConnected && (
          <p className="text-center text-xs text-mute">Connect your wallet to claim unlocked tranches.</p>
        )}
      </div>

      {/* Timeline */}
      <ol className="relative space-y-3">
        {tranches.map((t, i) => (
          <TrancheRow
            key={t.c + t.i}
            tranche={t}
            position={i + 1}
            total={tranches.length}
            disabled={!isConnected || !!addressMismatch}
          />
        ))}
      </ol>
    </div>
  );
}

function TrancheRow({
  tranche,
  position,
  total,
  disabled,
}: {
  tranche: ParsedTranche;
  position: number;
  total: number;
  disabled: boolean;
}) {
  const unlocked = isTrancheUnlocked(tranche.u);

  const [revealHandle, setRevealHandle] = useState<`0x${string}` | "">("");
  const [decryptedAmount, setDecryptedAmount] = useState<bigint | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isClaimedQuery = useAirdropIsSignatureClaimed({
    address: tranche.c as `0x${string}`,
    user: tranche.r as unknown as `0x${string}`, // not used; kept for shape
    encryptedAmountHandle: (tranche.h as `0x${string}`) || undefined,
  });
  const alreadyClaimed = isClaimedQuery.data === true;

  const revealMutation = useGetClaimAmount({ address: tranche.c as `0x${string}` });
  const claimMutation = useClaim({ address: tranche.c as `0x${string}` });

  const decryptQuery = useUserDecrypt(
    {
      handles: revealHandle
        ? [{ handle: revealHandle, contractAddress: tranche.c as `0x${string}` }]
        : [],
    },
    {
      enabled: !!revealHandle,
      retry: 4,
      retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 8000),
    },
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
        ? "Relayer is slow — wait a moment and verify again."
        : msg || "Decryption failed.",
    );
  }, [decryptQuery.error]);

  const isRevealing =
    revealMutation.isPending || (!!revealHandle && decryptedAmount === null && decryptQuery.isFetching);

  const handleReveal = async () => {
    setErrorMsg("");
    try {
      const result = await revealMutation.mutateAsync({
        encryptedInput: { handle: tranche.h as `0x${string}`, inputProof: tranche.p as `0x${string}` },
        signature: tranche.s as `0x${string}`,
      });
      setRevealHandle(result.handle);
    } catch (err: any) {
      const msg = (err?.message ?? String(err)) + " " + (err?.cause?.message ?? "");
      setErrorMsg(
        isTransientRelayerError(msg)
          ? "Network slow (relayer/RPC). Wait a moment and verify again."
          : err?.message || "Reveal failed.",
      );
    }
  };

  const handleClaim = async () => {
    setErrorMsg("");
    try {
      const hash = await claimMutation.mutateAsync({
        encryptedInput: { handle: tranche.h as `0x${string}`, inputProof: tranche.p as `0x${string}` },
        signature: tranche.s as `0x${string}`,
      });
      setSuccessMsg(`Claimed · ${hash.slice(0, 10)}…`);
      isClaimedQuery.refetch();
    } catch (err: any) {
      setErrorMsg(err?.message || "Claim failed.");
    }
  };

  // Visual state
  const state: "claimed" | "available" | "locked" = alreadyClaimed
    ? "claimed"
    : unlocked
      ? "available"
      : "locked";

  return (
    <li className="relative flex gap-3 rounded-xl border border-edge bg-panel p-4 shadow-sm">
      {/* connector line */}
      {position < total && (
        <span className="absolute left-[34px] top-[52px] bottom-[-12px] w-px bg-edge" aria-hidden />
      )}
      <Marker state={state} n={position} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">Unlock {position}</p>
            <p className="text-xs text-mute">
              {state === "locked" ? `Unlocks ${formatUnlockDate(tranche.u)}` : formatUnlockDate(tranche.u)}
            </p>
          </div>
          <div className="text-right">
            {decryptedAmount !== null ? (
              <span className="font-mono text-sm font-semibold text-ink">
                <AmountReveal raw={decryptedAmount} /> tokens
              </span>
            ) : (
              <span className="font-mono text-sm tracking-widest text-faint select-none" title="Encrypted — verify to reveal">
                •••••• tokens
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {state === "claimed" && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Claimed
          </p>
        )}

        {state === "locked" && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-mute">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Locked until {formatUnlockDate(tranche.u)}
          </p>
        )}

        {state === "available" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {decryptedAmount === null ? (
              <button
                onClick={handleReveal}
                disabled={disabled || isRevealing}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100 disabled:opacity-50"
              >
                {isRevealing ? "Verifying…" : "Decrypt & verify"}
              </button>
            ) : (
              <button
                onClick={handleClaim}
                disabled={disabled || claimMutation.isPending}
                className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
              >
                {claimMutation.isPending ? "Claiming…" : "Claim this unlock"}
              </button>
            )}
          </div>
        )}

        {errorMsg && <p className="mt-2 text-xs text-danger">{errorMsg}</p>}
        {successMsg && <p className="mt-2 text-xs font-semibold text-emerald-700 break-all">{successMsg}</p>}
      </div>
    </li>
  );
}

function Marker({ state, n }: { state: "claimed" | "available" | "locked"; n: number }) {
  if (state === "claimed") {
    return (
      <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </span>
    );
  }
  if (state === "available") {
    return (
      <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-50 text-sm font-bold text-emerald-700">
        {n}
      </span>
    );
  }
  return (
    <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-panel-2 text-sm font-bold text-mute/50">
      {n}
    </span>
  );
}

/** Count-up reveal of a decrypted tranche amount (honors reduced motion). */
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
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [mv, target, reduceMotion]);

  const isSettled = Math.abs(display - target) < 0.5;
  const text = isSettled ? formatTokens(raw) : display.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (
    <motion.span initial={reduceMotion ? false : { opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {text}
    </motion.span>
  );
}
