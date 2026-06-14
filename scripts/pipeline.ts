/**
 * Headless end-to-end pipeline: create+fund → authorize → claim → verify-decrypt.
 *
 * PURPOSE: prove the entire confidential-airdrop lifecycle works against Sepolia
 * from the command line, BEFORE building UI. If this passes, the frontend is just
 * buttons on proven calls.
 *
 * All call shapes below are taken from the INSTALLED @tokenops/sdk type defs
 * (dist/fhe-airdrop/*.d.ts), not from docs — the package is the source of truth.
 *
 * RUN:
 *   1. cp .env.example .env  and fill ADMIN_PRIVATE_KEY, RECIPIENT_PRIVATE_KEY,
 *      RPC_URL, VITE_MOCK_TOKEN_ADDRESS (deploy mock-token first; admin wallet
 *      must hold a confidential balance — run the faucet as the admin).
 *   2. pnpm pipeline
 */
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { RelayerNode, SepoliaConfig } from "@zama-fhe/sdk/node";
import {
  createConfidentialAirdropFactoryClient,
  createConfidentialAirdropClient,
  encryptUint64,
  signClaimAuthorization,
} from "@tokenops/sdk/fhe-airdrop";

/**
 * Disk-backed GenericStorage so the multi-MB FHE public key/params download from
 * the relayer ONCE and persist across runs. Without this, RelayerNode defaults to
 * MemoryStorage and re-fetches every run, which times out against the flaky public
 * testnet relayer (NODE_INIT 60s). Uint8Array values are tagged + base64-encoded.
 */
const CACHE_DIR = join(process.cwd(), ".fhe-cache");
function fileStorage() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const keyPath = (k: string) => join(CACHE_DIR, encodeURIComponent(k) + ".json");
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      const p = keyPath(key);
      if (!existsSync(p)) return null;
      const raw = JSON.parse(readFileSync(p, "utf8"));
      if (raw && raw.__u8) return Uint8Array.from(Buffer.from(raw.b64, "base64")) as T;
      return raw.v as T;
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      const wrapped =
        value instanceof Uint8Array
          ? { __u8: true, b64: Buffer.from(value).toString("base64") }
          : { v: value };
      writeFileSync(keyPath(key), JSON.stringify(wrapped));
    },
    async delete(key: string): Promise<void> {
      const p = keyPath(key);
      if (existsSync(p)) rmSync(p);
    },
  };
}

// Minimal ERC-7984 setOperator ABI — deadline is uint48 (NOT uint256; wrong
// type encodes silently). Used so the factory can pull the admin's tokens to fund.
const erc7984SetOperatorAbi = [
  {
    type: "function",
    name: "setOperator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "until", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (see .env.example)`);
  return v;
}

/**
 * Retry a relayer-dependent step. Zama's public testnet relayer intermittently
 * times out (30s, hardcoded in the SDK worker) or returns a fetch error during
 * the server-side ZK proof step. These ops throw BEFORE any on-chain submission,
 * so retrying is safe and the run stays idempotent on `userSalt`.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Inspect both the error message and its .cause (the SDK wraps the timeout
      // inside a ConfigurationError whose top message is "Failed to initialize…").
      const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : "";
      const msg = (err instanceof Error ? err.message : String(err)) + " " + cause;
      const transient =
        /timed out|fetch failed|Fetch POST failed|ENCRYPT|NODE_INIT|worker pool|initialize FHE|network|ECONNRESET|ETIMEDOUT/i.test(
          msg,
        );
      if (!transient || i === attempts) throw err;
      const waitMs = 2000 * i;
      console.log(`     ⚠ ${label} attempt ${i}/${attempts} failed (${msg.split("\n")[0]}). retrying in ${waitMs / 1000}s…`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

async function main() {
  const rpcUrl = need("RPC_URL");
  const adminPk = need("ADMIN_PRIVATE_KEY") as `0x${string}`;
  const recipientPk = need("RECIPIENT_PRIVATE_KEY") as `0x${string}`;
  const token = need("VITE_MOCK_TOKEN_ADDRESS") as `0x${string}`;

  const admin = privateKeyToAccount(adminPk);
  const recipient = privateKeyToAccount(recipientPk);

  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const adminWallet = createWalletClient({ account: admin, chain: sepolia, transport: http(rpcUrl) });
  const recipientWallet = createWalletClient({
    account: recipient,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  // Node relayer for headless FHE encryption (browser uses @zama-fhe/react-sdk).
  // fheArtifactStorage persists the FHE public params to disk so we don't re-download
  // them (and time out) on every run.
  const encryptor = new RelayerNode({
    transports: { [SepoliaConfig.chainId]: { ...SepoliaConfig, network: rpcUrl } },
    getChainId: () => Promise.resolve(sepolia.id),
    fheArtifactStorage: fileStorage(),
  });

  const allocation = 1_000_000n; // 1 cmUSD @ 6 decimals
  const now = Math.floor(Date.now() / 1000);
  // Unique salt per run → fresh campaign address each time (avoids colliding with
  // a previously-deployed clone). Override with USER_SALT env for a fixed address.
  const userSalt = (process.env.USER_SALT ??
    `0x${now.toString(16).padStart(64, "0")}`) as `0x${string}`;

  console.log("admin    :", admin.address);
  console.log("recipient:", recipient.address);
  console.log("token    :", token);

  const factory = createConfidentialAirdropFactoryClient({
    publicClient,
    walletClient: adminWallet,
    encryptor,
  });
  console.log("factory  :", factory.address);

  // 1) Authorize the factory to pull the admin's confidential tokens (uint48 deadline).
  console.log("\n1/5  setOperator(factory) on token…");
  const until = 2_000_000_000; // ~year 2033, fits uint48
  const opHash = await adminWallet.writeContract({
    address: token,
    abi: erc7984SetOperatorAbi,
    functionName: "setOperator",
    args: [factory.address, until],
  });
  await publicClient.waitForTransactionReceipt({ hash: opHash });
  console.log("     ok:", opHash);

  // 2) Deploy + fund the campaign in one tx. SDK encrypts `amount` via encryptor.
  console.log("\n2/5  createAndFundConfidentialAirdrop…");
  const params = {
    token,
    startTimestamp: now + 30,
    endTimestamp: now + 7 * 86400,
    canExtendClaimWindow: true,
    admin: admin.address,
  };
  const { airdrop: airdropAddress, hash: createHash } = await withRetry(
    "createAndFund",
    () =>
      factory.createAndFundConfidentialAirdrop({
        params,
        userSalt,
        amount: allocation, // pool seed; >= total of all claims
      }),
  );
  console.log("     campaign:", airdropAddress, "tx:", createHash);

  // 3) Authorize the recipient: encrypt (bound to recipient) + admin EIP-712 sign.
  console.log("\n3/5  encrypt + signClaimAuthorization…");
  const encrypted = await withRetry("encryptUint64", () =>
    encryptUint64({
      encryptor,
      contractAddress: airdropAddress,
      userAddress: recipient.address, // MUST be recipient, not admin
      value: allocation,
    }),
  );
  const signature = await signClaimAuthorization({
    walletClient: adminWallet,
    airdropAddress,
    recipient: recipient.address,
    encryptedAmountHandle: encrypted.handle,
  });
  console.log("     payload ready");

  // 4) Recipient VERIFIES first (reveal allocation), then claims. Order matters:
  //    getClaimAmount requires the signature to still be UNCLAIMED, so it must
  //    run before claim() consumes it. This mirrors the real UX: reveal → claim.
  const airdrop = createConfidentialAirdropClient({
    publicClient,
    walletClient: recipientWallet,
    address: airdropAddress,
  });

  console.log("\n4/5  waiting for claim window, then verify (getClaimAmount)…");
  while (!(await airdrop.isClaimWindowActive())) {
    await new Promise((r) => setTimeout(r, 3000));
  }
  const view = await withRetry("getClaimAmount", () =>
    airdrop.getClaimAmount({ encryptedInput: encrypted, signature }),
  );
  await publicClient.waitForTransactionReceipt({ hash: view.hash });
  console.log("     granted handle:", view.handle, "tx:", view.hash);
  console.log(
    "     (recipient now decrypts this handle via relayer.userDecrypt with an",
    "EIP-712 keypair to read plaintext — wired in the dApp. allocation was",
    allocation.toString(), "raw units)",
  );

  // 5) Claim — consumes the signature and transfers the encrypted tokens.
  console.log("\n5/5  claim…");
  const claimHash = await airdrop.claim({ encryptedInput: encrypted, signature });
  await publicClient.waitForTransactionReceipt({ hash: claimHash });
  console.log("     claimed:", claimHash);

  console.log("\nPipeline complete ✅  campaign:", airdropAddress);
}

main().catch((err) => {
  console.error("\nPipeline failed ❌\n", err);
  process.exitCode = 1;
});
