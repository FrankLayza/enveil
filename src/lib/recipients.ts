import { getAddress, isAddress } from "viem";

/** ERC-7984 confidential tokens use 6 decimals (matches TokenOps SDK examples). */
export const TOKEN_DECIMALS = 6;
const ONE = 10n ** BigInt(TOKEN_DECIMALS);

export interface Recipient {
  /** Stable id for React keys / row edits. */
  id: string;
  /** Raw user-entered address (may be invalid mid-edit). */
  address: string;
  /** Raw user-entered amount string (whole tokens, may be invalid mid-edit). */
  amount: string;
  /**
   * Optional free-text display name (e.g. "Engineering Lead"). Off-chain only —
   * never sent on-chain; used in the admin tables and the delivered claim links
   * so a human can tell which allocation belongs to whom.
   */
  label?: string;
}

/**
 * Campaign type — mostly display-only framing. EXCEPTION: "vesting" changes the
 * deploy flow (one confidential airdrop per dated tranche instead of one); see
 * lib/vesting.ts and StepVesting.
 */
export type CampaignType = "payroll" | "investor" | "community" | "vesting";

/** Singular noun for recipients under each campaign type (for UI copy). */
export function recipientNoun(type: CampaignType): string {
  switch (type) {
    case "payroll":
      return "contributor";
    case "investor":
      return "investor";
    case "vesting":
      return "grantee";
    default:
      return "recipient";
  }
}

export interface RecipientIssue {
  field: "address" | "amount";
  message: string;
}

/** Validate one row. Returns [] when clean. */
export function validateRecipient(r: Recipient, allAddresses: string[]): RecipientIssue[] {
  const issues: RecipientIssue[] = [];

  const addr = r.address.trim();
  if (!addr) {
    issues.push({ field: "address", message: "Address required" });
  } else if (!isAddress(addr)) {
    issues.push({ field: "address", message: "Not a valid address" });
  } else {
    const dupes = allAddresses.filter((a) => a.trim().toLowerCase() === addr.toLowerCase());
    if (dupes.length > 1) issues.push({ field: "address", message: "Duplicate recipient" });
  }

  const amt = r.amount.trim();
  if (!amt) {
    issues.push({ field: "amount", message: "Amount required" });
  } else if (!/^\d+(\.\d{1,6})?$/.test(amt)) {
    issues.push({ field: "amount", message: "Positive number, ≤6 decimals" });
  } else if (toRawUnits(amt) <= 0n) {
    issues.push({ field: "amount", message: "Must be greater than 0" });
  }

  return issues;
}

/** Whole-token string ("1,200" or "1200.5") → raw uint64 units. */
export function toRawUnits(amount: string): bigint {
  const clean = amount.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,6})?$/.test(clean)) return 0n;
  const [whole, frac = ""] = clean.split(".");
  const fracPadded = (frac + "0".repeat(TOKEN_DECIMALS)).slice(0, TOKEN_DECIMALS);
  return BigInt(whole) * ONE + BigInt(fracPadded || "0");
}

/** Raw units → display string with thousands separators, trimmed decimals. */
export function formatTokens(raw: bigint): string {
  const whole = raw / ONE;
  const frac = raw % ONE;
  const wholeStr = whole.toLocaleString("en-US");
  if (frac === 0n) return wholeStr;
  const fracStr = frac.toString().padStart(TOKEN_DECIMALS, "0").replace(/0+$/, "");
  return `${wholeStr}.${fracStr}`;
}

/** Shorten an address for display: 0x4a3b…c92d */
export function shortAddress(addr: string): string {
  if (!isAddress(addr)) return addr;
  const a = getAddress(addr);
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Parse pasted/dropped CSV text into rows. Tolerant of headers and either delimiter. */
export function parseRecipientsCsv(text: string, makeId: () => string): Recipient[] {
  const rows: Recipient[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cells = line.split(/[,\t;]/).map((c) => c.trim());
    if (cells.length < 2) continue;
    const [address, amount, label] = cells;
    // Skip a header row like "address,amount,label"
    if (/address/i.test(address) && /amount/i.test(amount)) continue;
    rows.push({ id: makeId(), address, amount, label: label ?? "" });
  }
  return rows;
}

/** Sum of valid rows in raw units. */
export function totalRawUnits(recipients: Recipient[]): bigint {
  return recipients.reduce((sum, r) => sum + toRawUnits(r.amount), 0n);
}
