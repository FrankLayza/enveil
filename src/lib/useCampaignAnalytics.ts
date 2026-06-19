import { useQuery, useQueries, type UseQueryResult } from "@tanstack/react-query";
import { usePublicClient, useChainId } from "wagmi";
import { parseAbiItem, type Address, type PublicClient } from "viem";
import { getFheAirdropFactoryAddress } from "@tokenops/sdk";
import { env } from "@/lib/env";
import { TOKENOPS_AIRDROP_FACTORY_SEPOLIA } from "@/lib/addresses";
import { getStoredCampaign } from "@/lib/campaigns";
import type { CampaignType } from "@/lib/recipients";

/* ── Event ABIs (inline; mirrors StepFund's literal-ABI style — no SDK ABI dep) ── */
const confidentialAirdropCreatedEvent = parseAbiItem(
  "event ConfidentialAirdropCreated(address indexed airdrop, address indexed token, address indexed admin, address feeCollector, uint256 gasFee, uint32 startTime, uint32 endTime, bool canExtendClaimWindow, address creator, bytes32 userSalt)",
);
const claimedEvent = parseAbiItem(
  "event Claimed(address indexed user, bytes32 signatureHash)",
);

export type CampaignStatus = "scheduled" | "active" | "ended";

export function deriveStatus(start: number, end: number, now = Math.floor(Date.now() / 1000)): CampaignStatus {
  if (now < start) return "scheduled";
  if (now >= end) return "ended";
  return "active";
}

export interface MergedCampaign {
  address: Address;
  token: Address;
  admin: Address;
  startTime: number;
  endTime: number;
  /** Block of the creation log — used as fromBlock for claim-count scans. */
  creationBlock: bigint;
  status: CampaignStatus;
  /** From localStorage (off-chain); undefined for campaigns recovered elsewhere. */
  name?: string;
  campaignType?: CampaignType;
  totalRecipients?: number;
}

function resolveFactory(chainId: number): Address {
  return (env.factoryAddressOverride ||
    getFheAirdropFactoryAddress(chainId) ||
    TOKENOPS_AIRDROP_FACTORY_SEPOLIA) as Address;
}

/**
 * Default block window to scan when VITE_FACTORY_FROM_BLOCK isn't set. Many RPCs
 * (Infura, public/non-archive nodes) reject `eth_getLogs` from block 0 or over a
 * huge range — so we scan a bounded recent window ending at the latest block.
 * ~1M Sepolia blocks ≈ several months, which covers this dApp's whole lifetime.
 */
const DEFAULT_LOOKBACK_BLOCKS = 500_000n;
/** Per-request span for the chunked fallback (≤10k fits most public-RPC getLogs caps). */
const CHUNK_SPAN = 9_000n;

/**
 * Fetch the admin's creation logs. Tries one full-range request (fast on Alchemy,
 * which allows wide address-filtered ranges); on failure (range/result caps),
 * falls back to fixed-size chunked scanning so it works on any provider.
 */
async function getCreatedLogs(
  client: PublicClient,
  factory: Address,
  admin: Address,
  fromBlock: bigint,
  toBlock: bigint,
) {
  const base = { address: factory, event: confidentialAirdropCreatedEvent, args: { admin } } as const;
  try {
    return await client.getLogs({ ...base, fromBlock, toBlock });
  } catch (err) {
    console.warn(
      "[campaigns] full-range getLogs failed; falling back to chunked scan. " +
        "Set VITE_FACTORY_FROM_BLOCK to the factory deploy block for speed.",
      err,
    );
    const out: Awaited<ReturnType<typeof client.getLogs>> = [];
    for (let start = fromBlock; start <= toBlock; start += CHUNK_SPAN + 1n) {
      const end = start + CHUNK_SPAN > toBlock ? toBlock : start + CHUNK_SPAN;
      const chunk = await client.getLogs({ ...base, fromBlock: start, toBlock: end });
      out.push(...chunk);
    }
    return out;
  }
}

/**
 * List the connected admin's campaigns from factory `ConfidentialAirdropCreated`
 * logs (the `admin` topic is indexed, so this filters server-side and works on
 * any device). Merges off-chain metadata (name/type/totalRecipients) from
 * localStorage. Sorted newest first.
 */
export function useMyCampaigns(admin?: string): UseQueryResult<MergedCampaign[], Error> {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  return useQuery({
    queryKey: ["myCampaigns", chainId, admin?.toLowerCase()],
    enabled: !!publicClient && !!admin,
    staleTime: 30_000,
    queryFn: async () => {
      const latest = await publicClient!.getBlockNumber();
      const fromBlock =
        env.factoryFromBlock > 0n
          ? env.factoryFromBlock
          : latest > DEFAULT_LOOKBACK_BLOCKS
            ? latest - DEFAULT_LOOKBACK_BLOCKS
            : 0n;
      const logs = await getCreatedLogs(
        publicClient! as PublicClient,
        resolveFactory(chainId),
        admin as Address,
        fromBlock,
        latest,
      );

      const campaigns: MergedCampaign[] = logs.map((log) => {
        const a = log.args;
        const address = (a.airdrop as Address) ?? ("0x" as Address);
        const start = Number(a.startTime ?? 0);
        const end = Number(a.endTime ?? 0);
        const meta = getStoredCampaign(address);
        return {
          address,
          token: (a.token as Address) ?? ("0x" as Address),
          admin: (a.admin as Address) ?? ("0x" as Address),
          startTime: start,
          endTime: end,
          creationBlock: log.blockNumber ?? 0n,
          status: deriveStatus(start, end),
          name: meta?.name || undefined,
          campaignType: meta?.campaignType,
          totalRecipients: meta?.totalRecipients,
        };
      });

      // Newest first (by creation block).
      return campaigns.sort((x, y) => Number(y.creationBlock - x.creationBlock));
    },
  });
}

/**
 * Count `Claimed` events for one campaign (privacy-safe — count only, no
 * amounts). Polls every 20s only while the campaign is active.
 */
export function useClaimCount(
  address?: Address,
  fromBlock?: bigint,
  active = false,
): UseQueryResult<number, Error> {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  return useQuery({
    queryKey: ["claimCount", chainId, address?.toLowerCase()],
    enabled: !!publicClient && !!address,
    staleTime: 15_000,
    refetchInterval: active ? 20_000 : false,
    queryFn: async () => {
      const logs = await publicClient!.getLogs({
        address: address as Address,
        event: claimedEvent,
        fromBlock: fromBlock ?? env.factoryFromBlock,
        toBlock: "latest",
      });
      return logs.length;
    },
  });
}

export interface CampaignClaimCounts {
  /** Map of lowercased campaign address → claim count (undefined while loading). */
  byAddress: Record<string, number | undefined>;
  /** Sum of all known counts. */
  totalClaims: number;
  isLoading: boolean;
}

/**
 * Claim counts for a whole list of campaigns (powers the dashboard stat cards).
 * Shares queryKeys with useClaimCount so per-card reads dedupe automatically.
 */
export function useCampaignClaimCounts(campaigns: MergedCampaign[]): CampaignClaimCounts {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  return useQueries({
    queries: campaigns.map((c) => ({
      queryKey: ["claimCount", chainId, c.address.toLowerCase()],
      enabled: !!publicClient,
      staleTime: 15_000,
      refetchInterval: (c.status === "active" ? 20_000 : false) as number | false,
      queryFn: async () => {
        const logs = await publicClient!.getLogs({
          address: c.address,
          event: claimedEvent,
          fromBlock: c.creationBlock,
          toBlock: "latest" as const,
        });
        return logs.length;
      },
    })),
    combine: (results) => {
      const byAddress: Record<string, number | undefined> = {};
      let totalClaims = 0;
      let isLoading = false;
      results.forEach((r, i) => {
        const key = campaigns[i].address.toLowerCase();
        byAddress[key] = r.data;
        if (typeof r.data === "number") totalClaims += r.data;
        if (r.isLoading) isLoading = true;
      });
      return { byAddress, totalClaims, isLoading };
    },
  });
}
