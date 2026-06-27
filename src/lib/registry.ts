/**
 * RecipientRegistry — ABI, address, and wagmi hooks for the on-chain
 * recipient membership registry used by wallet-based claim discovery.
 */

import { useReadContract } from "wagmi";
import { RECIPIENT_REGISTRY_SEPOLIA } from "@/lib/addresses";

/* ── ABI (only the functions/events the frontend needs) ──────────────── */

export const REGISTRY_ABI = [
  {
    type: "function",
    name: "registerRecipients",
    inputs: [
      { name: "campaign", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "name", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "checkRecipient",
    inputs: [
      { name: "campaign", type: "address" },
      { name: "wallet", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "campaignName",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "recipientCount",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registeredBy",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "RecipientsRegistered",
    inputs: [
      { name: "campaign", type: "address", indexed: true },
      { name: "count", type: "uint256", indexed: false },
    ],
  },
] as const;

/* ── Hooks ───────────────────────────────────────────────────────────── */

/**
 * Check whether `wallet` is a registered recipient of `campaign`.
 * Returns { data: boolean | undefined, isLoading, isError, ... }.
 * This is a view call — no gas cost.
 */
export function useCheckRecipient(
  campaignAddress: `0x${string}` | undefined,
  walletAddress: `0x${string}` | undefined,
) {
  return useReadContract({
    address: RECIPIENT_REGISTRY_SEPOLIA,
    abi: REGISTRY_ABI,
    functionName: "checkRecipient",
    args:
      campaignAddress && walletAddress
        ? [campaignAddress, walletAddress]
        : undefined,
    query: {
      enabled: !!campaignAddress && !!walletAddress,
    },
  });
}

/**
 * Fetch the human-readable campaign name stored at registration time.
 */
export function useCampaignName(campaignAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: RECIPIENT_REGISTRY_SEPOLIA,
    abi: REGISTRY_ABI,
    functionName: "campaignName",
    args: campaignAddress ? [campaignAddress] : undefined,
    query: {
      enabled: !!campaignAddress,
    },
  });
}

/**
 * Fetch the number of recipients registered for a campaign.
 */
export function useRecipientCount(campaignAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: RECIPIENT_REGISTRY_SEPOLIA,
    abi: REGISTRY_ABI,
    functionName: "recipientCount",
    args: campaignAddress ? [campaignAddress] : undefined,
    query: {
      enabled: !!campaignAddress,
    },
  });
}

/**
 * Fetch who registered recipients for a campaign (address(0) if none).
 */
export function useRegisteredBy(campaignAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: RECIPIENT_REGISTRY_SEPOLIA,
    abi: REGISTRY_ABI,
    functionName: "registeredBy",
    args: campaignAddress ? [campaignAddress] : undefined,
    query: {
      enabled: !!campaignAddress,
    },
  });
}

/* ── Constants ───────────────────────────────────────────────────────── */

/** Maximum recipients per registerRecipients transaction (gas safety). */
export const REGISTER_BATCH_SIZE = 50;
