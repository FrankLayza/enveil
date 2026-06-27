import { gzipSync, gunzipSync, strToU8, strFromU8 } from "fflate";

/* *
 * Claim links are self-contained — they carry the entire encrypted payload
 * (FHE inputProof + handle + EIP-712 signature) so the recipient needs nothing
 * but the URL. Those proofs are large and high-entropy, so we gzip the JSON
 * payload and base64url it into a single fragment param (`#z=`). This is ~40%
 * shorter than the old raw `encodeURIComponent`'d JSON (which tripled every
 * quote/colon into %22/%3A) and stays fully client-side — no backend, no
 * external shortener, the payload never leaves the sender's machine.
 *
 * gzip via fflate is synchronous and runs in the browser (unlike the async
 * CompressionStream), so link builders stay synchronous.
 *
 * The value is base64url (`A-Za-z0-9-_`, no padding), so it is URI-safe and
 * must NOT be run through URLSearchParams (which would turn any `+` into a
 * space). Extract it with a regex and decode directly. */

/* * Compact single (non-vesting) claim payload. */
export interface SingleClaimPayload {
  c: string; // campaign address
  r: string; // recipient address
  a: string; // plaintext amount (display only)
  h: string; // encrypted handle
  p: string; // FHE input proof
  s: string; // EIP-712 signature
  l?: string; // optional label
}

/* * Compact vesting claim payload (mirrors VestingPayload). */
export interface VestingClaimPayload {
  r: string;
  l?: string;
  total: string;
  t: Array<{
    i: number;
    c: string;
    u: number;
    a: string;
    h: string;
    p: string;
    s: string;
  }>;
}

export type ClaimPayload = SingleClaimPayload | VestingClaimPayload;

export function isVestingPayload(p: any): p is VestingClaimPayload {
  return !!p && Array.isArray(p.t) && typeof p.r === "string";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* * Build the `#z=` fragment value for a payload. */
export function encodeClaimPayload(payload: ClaimPayload): string {
  const gz = gzipSync(strToU8(JSON.stringify(payload)), { level: 9 });
  return bytesToBase64Url(gz);
}

/* * Build a full claim URL from a payload. */
export function buildClaimLink(origin: string, payload: ClaimPayload): string {
  return `${origin}/claim#z=${encodeClaimPayload(payload)}`;
}

/* *
 * Decode a `#z=` value back into a payload. Returns null on any failure so the
 * caller can fall through to the legacy link formats. */
export function decodeClaimPayload(z: string): ClaimPayload | null {
  try {
    const json = strFromU8(gunzipSync(base64UrlToBytes(z)));
    const parsed = JSON.parse(json);
    return parsed ?? null;
  } catch {
    return null;
  }
}

/** Build a simple campaign link (no payload — just the campaign address). */
export function buildCampaignLink(origin: string, campaignAddress: string): string {
  return `${origin}/claim/${campaignAddress}`;
}

