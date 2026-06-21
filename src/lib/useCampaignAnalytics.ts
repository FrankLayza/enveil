import { useQuery, useQueries, type UseQueryResult } from "@tanstack/react-query";
import { usePublicClient, useChainId } from "wagmi";
import { parseAbiItem, type Address, type PublicClient, type AbiEvent } from "viem";
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
 * Default block window to scan when VITE_FACTORY_FROM_BLOCK isn't set. RPCs cap
 * `eth_getLogs` ranges (Alchemy free ~10 blocks, publicnode 50k, etc.), so we
 * always chunk — this just bounds how far back we look. ~500k Sepolia blocks ≈
 * a couple months, covering this dApp's whole lifetime.
 */
const DEFAULT_LOOKBACK_BLOCKS = 500_000n;

/**
 * Per-request block span + concurrency, tuned to the configured RPC — because no
 * single value fits both worlds:
 *   • Alchemy free tier caps eth_getLogs at a ~2k block RANGE (400 above it) AND
 *     throttles bursts hard (429). It needs SMALL ranges + LOW concurrency.
 *   • Public nodes (publicnode etc.) allow ~50k ranges, so a BIG span means far
 *     fewer requests and no burst — small spans there just trip rate limits.
 * Ranges are inclusive (`CHUNK_SPAN + 1` blocks), so 1900 stays safely under 2k.
 * `getLogsRange`'s adaptive bisection remains the safety net for anything stricter.
 */
const IS_ALCHEMY = /alchemy\.com/i.test(env.rpcUrl);
const CHUNK_SPAN = IS_ALCHEMY ? 1_900n : 9_000n;
const SCAN_CONCURRENCY = IS_ALCHEMY ? 2 : 3;

/**
 * Public RPCs (publicnode et al.) rate-limit a burst of getLogs with 403/429 or
 * a timeout. Retry transient failures with exponential backoff so a brief throttle
 * self-heals instead of failing the whole dashboard. getLogs is a pure read — safe
 * to retry. Non-transient errors (bad params, range too large) throw immediately.
 */
function isTransientRpcError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  return (
    msg.includes("403") ||
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("forbidden") ||
    msg.includes("rate limit") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch failed") ||
    msg.includes("err_failed") ||
    msg.includes("network")
  );
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 5, baseDelayMs = 700): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !isTransientRpcError(err)) throw err;
      // Exponential backoff (capped) + jitter to desync concurrent scans and ride
      // out rate-limit windows (429) instead of hammering.
      const delay = Math.min(baseDelayMs * 2 ** i, 8000) + Math.floor(Math.random() * 350);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Resolve the [fromBlock, latest] window to scan, honoring the env override. */
async function resolveWindow(client: PublicClient): Promise<[bigint, bigint]> {
  const latest = await client.getBlockNumber();
  const from =
    env.factoryFromBlock > 0n
      ? env.factoryFromBlock
      : latest > DEFAULT_LOOKBACK_BLOCKS
        ? latest - DEFAULT_LOOKBACK_BLOCKS
        : 0n;
  return [from, latest];
}

/**
 * A range/response-size rejection — structurally distinct from a transient
 * throttle. The request is simply too big for this provider (e.g. drpc free's
 * "ranges over 10000 blocks", Alchemy's 2k cap), so splitting the range helps.
 *
 * CRUCIAL: auth/policy rejections (publicnode's "Archive requests require a
 * personal token", missing-API-key) are NOT range errors — splitting them just
 * re-fails on every sub-range and storms the RPC. Exclude those explicitly, and
 * match on specific size/range PHRASES rather than bare JSON-RPC codes (codes
 * like -32602 are also used for auth/param errors).
 */
function isRangeLimitError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  // Auth / policy / availability — never bisect these.
  if (
    msg.includes("personal token") ||
    msg.includes("api key") ||
    msg.includes("unauthorized") ||
    msg.includes("archive request") ||
    msg.includes("requires a token") ||
    msg.includes("authenticate")
  ) {
    return false;
  }
  return (
    msg.includes("block range") ||
    msg.includes("range is too") ||
    msg.includes("ranges over") ||
    msg.includes("too large") ||
    msg.includes("response size") ||
    msg.includes("returned more than") ||
    msg.includes("more than 10000") ||
    msg.includes("up to a") ||
    msg.includes("limited to") ||
    msg.includes("query timeout")
  );
}

/** Hard backstop on bisection recursion, so a misclassified error can't explode
 *  into thousands of requests. 8 levels splits a 9k chunk down to ~35 blocks. */
const MAX_BISECT_DEPTH = 8;

/**
 * getLogs for one [from, to] range: retries transient throttles (via withRetry)
 * and, if the provider rejects the range as too large, bisects and recurses.
 * This discovers whatever cap the endpoint enforces instead of hard-coding it,
 * so it works on drpc (10k), Alchemy free (2k), or anything in between. Auth and
 * policy errors are never bisected (see isRangeLimitError); depth is capped.
 */
async function getLogsRange<TEvent extends AbiEvent>(
  client: PublicClient,
  filter: { address: Address; event: TEvent; args?: Record<string, unknown> },
  fromBlock: bigint,
  toBlock: bigint,
  depth = 0,
): Promise<Awaited<ReturnType<typeof client.getLogs<TEvent>>>> {
  try {
    return (await withRetry(() =>
      client.getLogs({
        address: filter.address,
        event: filter.event,
        args: filter.args,
        fromBlock,
        toBlock,
      } as Parameters<typeof client.getLogs>[0]),
    )) as Awaited<ReturnType<typeof client.getLogs<TEvent>>>;
  } catch (err) {
    // Too big for this RPC and still splittable → bisect and recurse.
    if (depth < MAX_BISECT_DEPTH && isRangeLimitError(err) && toBlock > fromBlock) {
      const mid = fromBlock + (toBlock - fromBlock) / 2n;
      const [a, b] = await Promise.all([
        getLogsRange(client, filter, fromBlock, mid, depth + 1),
        getLogsRange(client, filter, mid + 1n, toBlock, depth + 1),
      ]);
      return [...a, ...b] as Awaited<ReturnType<typeof client.getLogs<TEvent>>>;
    }
    throw err;
  }
}

/** Map over items with a bounded number of concurrent workers, preserving order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Scan `getLogs` for a single event across a block window. Splits the window into
 * fixed chunks, fetches them with bounded concurrency, and lets `getLogsRange`
 * adaptively bisect any chunk the RPC rejects. Generic over the event so each
 * returned log keeps its decoded `.args`.
 */
async function scanLogs<TEvent extends AbiEvent>(
  client: PublicClient,
  filter: { address: Address; event: TEvent; args?: Record<string, unknown> },
  fromBlock: bigint,
  toBlock: bigint,
) {
  type LogItem = Awaited<ReturnType<typeof client.getLogs<TEvent>>>[number];
  const ranges: Array<[bigint, bigint]> = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SPAN + 1n) {
    const end = start + CHUNK_SPAN > toBlock ? toBlock : start + CHUNK_SPAN;
    ranges.push([start, end]);
  }
  const chunks = await mapWithConcurrency(ranges, SCAN_CONCURRENCY, ([s, e]) =>
    getLogsRange(client, filter, s, e),
  );
  return chunks.flat() as LogItem[];
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
      const client = publicClient! as PublicClient;
      const [fromBlock, latest] = await resolveWindow(client);
      const logs = await scanLogs(
        client,
        {
          address: resolveFactory(chainId),
          event: confidentialAirdropCreatedEvent,
          args: { admin: admin as Address },
        },
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
      const client = publicClient! as PublicClient;
      const latest = await client.getBlockNumber();
      const logs = await scanLogs(
        client,
        { address: address as Address, event: claimedEvent },
        fromBlock ?? env.factoryFromBlock,
        latest,
      );
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
        const client = publicClient! as PublicClient;
        const latest = await client.getBlockNumber();
        const logs = await scanLogs(
          client,
          { address: c.address, event: claimedEvent },
          c.creationBlock,
          latest,
        );
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
