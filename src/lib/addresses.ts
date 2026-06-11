/**
 * Known on-chain addresses.
 *
 * The TokenOps ConfidentialAirdrop factory is PRE-DEPLOYED by Zama/TokenOps —
 * we do not deploy it. The SDK resolves the live address automatically from its
 * internal DEPLOYED_ADDRESSES; the literal below is a documented fallback /
 * reference (Sepolia) and should be re-verified against docs.tokenops.xyz.
 */

import { sepolia } from "viem/chains";

export const CHAIN = sepolia;

/** Reference only — prefer the SDK's auto-resolved address. */
export const TOKENOPS_AIRDROP_FACTORY_SEPOLIA =
  "0xbE6A3B78B36684fFee48De77d47Bc3393F5Acd4c" as const;
