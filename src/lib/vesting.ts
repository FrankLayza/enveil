import { toRawUnits, formatTokens, type Recipient } from "@/lib/recipients";

/**
 * Confidential vesting = release a recipient's total in scheduled slices
 * ("tranches"), each kept encrypted on-chain. We don't have a streaming/vesting
 * contract — instead each tranche is its OWN confidential airdrop with a later
 * `startTimestamp` (the unlock date). This module is the off-chain schedule math:
 * it turns a few admin inputs into concrete unlock dates + per-tranche amounts.
 *
 * Honest framing: this is DISCRETE vesting (cliff + periodic unlocks), not
 * continuous streaming.
 */

const SECONDS_PER_DAY = 86_400;

/** Rough Sepolia gas for one create+fund tranche deploy (measured ~0.045 ETH). */
export const GAS_PER_TRANCHE_ETH = 0.05;

/** Demo/cost guardrails on the schedule shape. */
export const MIN_TRANCHES = 2;
export const MAX_TRANCHES = 12;

export interface VestingSchedule {
  /** Number of unlock slices. */
  trancheCount: number;
  /** Days between consecutive unlocks. */
  intervalDays: number;
  /** Delay (days) before the FIRST tranche unlocks. 0 = unlocks at start. */
  cliffDays: number;
  /** Base unix seconds — "TGE" / day zero. */
  startTs: number;
}

export const DEFAULT_SCHEDULE: Omit<VestingSchedule, "startTs"> = {
  trancheCount: 4,
  intervalDays: 30,
  cliffDays: 0,
};

export interface Tranche {
  /** 0-based slice index. */
  index: number;
  /** Unix seconds when this slice becomes claimable. */
  unlockTs: number;
}

/** Build the dated unlock schedule. Tranche i unlocks at start + cliff + i·interval. */
export function computeTranches(s: VestingSchedule): Tranche[] {
  const count = clampTrancheCount(s.trancheCount);
  const cliff = Math.max(0, Math.floor(s.cliffDays));
  const interval = Math.max(1, Math.floor(s.intervalDays));
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    unlockTs: s.startTs + (cliff + i * interval) * SECONDS_PER_DAY,
  }));
}

export function clampTrancheCount(n: number): number {
  if (!Number.isFinite(n)) return MIN_TRANCHES;
  return Math.min(MAX_TRANCHES, Math.max(MIN_TRANCHES, Math.floor(n)));
}

/**
 * Split a raw-unit total into `count` near-equal parts. Any remainder (from
 * non-divisible totals) is added to the LAST tranche so earlier slices stay
 * clean round numbers and the parts always sum back to the exact total.
 */
export function splitRawAmount(totalRaw: bigint, count: number): bigint[] {
  const n = BigInt(clampTrancheCount(count));
  const base = totalRaw / n;
  const parts = Array.from({ length: Number(n) }, () => base);
  const remainder = totalRaw - base * n;
  parts[parts.length - 1] += remainder;
  return parts;
}

/** A single recipient's vesting plan: their per-tranche amounts (raw + display). */
export interface RecipientVestingPlan {
  recipient: Recipient;
  /** raw uint64 amount for each tranche (sums to the recipient's total). */
  amountsRaw: bigint[];
  /** whole-token display string for each tranche. */
  amountsDisplay: string[];
}

/** Compute each recipient's per-tranche amounts for a given tranche count. */
export function buildRecipientPlans(
  recipients: Recipient[],
  count: number,
): RecipientVestingPlan[] {
  return recipients.map((r) => {
    const amountsRaw = splitRawAmount(toRawUnits(r.amount), count);
    return {
      recipient: r,
      amountsRaw,
      amountsDisplay: amountsRaw.map((a) => formatTokens(a)),
    };
  });
}

/** Sum of every recipient × tranche raw unit (== sum of recipient totals). */
export function planGrandTotalRaw(plans: RecipientVestingPlan[]): bigint {
  return plans.reduce(
    (sum, p) => sum + p.amountsRaw.reduce((s, a) => s + a, 0n),
    0n,
  );
}

/** Per-tranche pool total in raw units (what each tranche airdrop is funded with). */
export function tranchePoolTotalsRaw(plans: RecipientVestingPlan[], count: number): bigint[] {
  const n = clampTrancheCount(count);
  const totals = Array.from({ length: n }, () => 0n);
  for (const p of plans) {
    for (let i = 0; i < n; i++) totals[i] += p.amountsRaw[i] ?? 0n;
  }
  return totals;
}

/** Human label for a tranche's unlock date (locale date). */
export function formatUnlockDate(unlockTs: number): string {
  return new Date(unlockTs * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** True when a tranche's unlock time has passed (claimable now). */
export function isTrancheUnlocked(unlockTs: number, nowTs: number = Math.floor(Date.now() / 1000)): boolean {
  return nowTs >= unlockTs;
}

/* ── Delivery payload shapes (admin → recipient) ──────────────────────────── */

/** One authorized tranche for one recipient (its own confidential airdrop). */
export interface VestingTrancheAuth {
  index: number;
  /** The tranche airdrop clone address. */
  campaignAddress: string;
  unlockTs: number;
  /** Whole-token display amount for this tranche. */
  amount: string;
  encryptedInput: { handle: string; inputProof: string };
  signature: string;
}

/** Everything one recipient needs to claim their whole vesting plan. */
export interface VestingRecipientDelivery {
  address: string;
  label?: string;
  /** Whole-token display of the recipient's full grant (sum of tranches). */
  totalAmount: string;
  tranches: VestingTrancheAuth[];
}
