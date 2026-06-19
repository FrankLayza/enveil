import type { CampaignType } from "@/lib/recipients";

/**
 * Local metadata for campaigns the admin created. The authoritative campaign
 * list, status, and claim counts come from on-chain logs (see
 * useCampaignAnalytics) — but a campaign's human NAME, its total-recipients
 * DENOMINATOR, and its TYPE are off-chain (amounts/recipients are confidential),
 * so we cache them here, keyed by lowercased campaign address.
 *
 * All access is best-effort: localStorage can be unavailable (private mode,
 * quota, SSR). Every function swallows errors and returns a safe default — the
 * dashboard still renders from on-chain data alone if this layer is empty.
 */

const STORE_KEY = "dropshield.campaigns.v1";

export interface StoredCampaign {
  /** Lowercased clone address — primary key. */
  address: string;
  /** User-entered campaign name ("" if skipped). */
  name: string;
  campaignType: CampaignType;
  tokenAddress: string;
  /** Denominator for claim-progress %. */
  totalRecipients: number;
  startTimestamp: number;
  endTimestamp: number;
  /** Date.now() ms — sort fallback / mid-flow detection. */
  createdAt: number;
  /** Lowercased admin address — scopes reads per wallet. */
  admin: string;
}

type CampaignStore = Record<string, StoredCampaign>;

function readStore(): CampaignStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CampaignStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: CampaignStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota — ignore */
  }
}

/** Insert or merge a campaign (by address). Lowercases address + admin. */
export function saveCampaign(c: StoredCampaign): void {
  const key = c.address.toLowerCase();
  const store = readStore();
  store[key] = { ...store[key], ...c, address: key, admin: c.admin.toLowerCase() };
  writeStore(store);
}

export function getStoredCampaign(address: string): StoredCampaign | undefined {
  return readStore()[address.toLowerCase()];
}

/** All stored campaigns for a given admin, newest first. */
export function getStoredCampaigns(admin: string): StoredCampaign[] {
  const a = admin.toLowerCase();
  return Object.values(readStore())
    .filter((c) => c.admin === a)
    .sort((x, y) => y.createdAt - x.createdAt);
}

export function updateStoredCampaign(address: string, patch: Partial<StoredCampaign>): void {
  const key = address.toLowerCase();
  const store = readStore();
  if (!store[key]) return;
  store[key] = { ...store[key], ...patch, address: key };
  writeStore(store);
}
