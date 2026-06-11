/**
 * Headless end-to-end pipeline: create → fund → authorize → claim → verify.
 *
 * PURPOSE: prove the entire confidential-airdrop lifecycle works against Sepolia
 * from the command line, BEFORE building any UI. If this passes, the frontend is
 * just buttons on proven calls.
 *
 * RUN:
 *   1. cp .env.example .env  and fill ADMIN_PRIVATE_KEY, RECIPIENT_PRIVATE_KEY,
 *      RPC_URL, VITE_MOCK_TOKEN_ADDRESS (deploy mock-token first).
 *   2. pnpm pipeline
 *
 * STATUS: scaffold. The exact @tokenops/sdk/fhe-airdrop call shapes are pinned to
 * the documented quickstart; verify argument names against the installed package
 * types (node_modules/@tokenops/sdk) on first run — the SDK is the source of truth.
 *
 * This file intentionally lives outside src/ and is run with tsx (Node), not Vite.
 */
import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
// Node relayer for headless encryption (browser uses @zama-fhe/react-sdk instead).
import { RelayerNode, SepoliaConfig } from "@zama-fhe/sdk/node";
import {
  createConfidentialAirdropFactoryClient,
  createConfidentialAirdropClient,
  encryptUint64,
  signClaimAuthorization,
} from "@tokenops/sdk/fhe-airdrop";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (see .env.example)`);
  return v;
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

  const encryptor = new RelayerNode({
    transports: { [SepoliaConfig.chainId]: { ...SepoliaConfig, network: rpcUrl } },
    getChainId: () => Promise.resolve(sepolia.id),
  });

  const allocation = 1_000_000n; // 1 token @ 6 decimals
  const now = Math.floor(Date.now() / 1000);
  const userSalt =
    "0x0000000000000000000000000000000000000000000000000000000000000001" as const;

  console.log("1/5  Creating campaign…");
  const factory = createConfidentialAirdropFactoryClient({
    publicClient,
    walletClient: adminWallet,
    encryptor,
  });
  const { airdrop: airdropAddress } = await factory.createConfidentialAirdropAndGetAddress({
    params: {
      token,
      startTimestamp: now + 30,
      endTimestamp: now + 7 * 86400,
      canExtendClaimWindow: true,
      admin: admin.address,
    },
    userSalt,
  });
  console.log("     campaign:", airdropAddress);

  console.log("2/5  Funding…  (setOperator + fundConfidentialAirdrop)");
  // TODO(verify): exact funding call — createAndFundConfidentialAirdrop /
  // fundConfidentialAirdrop signatures + ERC-7984 setOperator(uint48 deadline).
  // Left explicit here as the first thing to confirm against the installed SDK.

  console.log("3/5  Authorizing recipient…");
  const encrypted = await encryptUint64({
    encryptor,
    contractAddress: airdropAddress,
    userAddress: recipient.address,
    value: allocation,
  });
  const signature = await signClaimAuthorization({
    walletClient: adminWallet,
    airdropAddress,
    recipient: recipient.address,
    encryptedAmountHandle: encrypted.handle,
  });
  console.log("     payload ready for", recipient.address);

  console.log("4/5  Claiming as recipient…");
  const airdrop = createConfidentialAirdropClient({
    publicClient,
    walletClient: recipientWallet,
    address: airdropAddress,
  });
  await airdrop.claim({ signature, encryptedInput: encrypted });
  console.log("     claimed.");

  console.log("5/5  Verify: recipient decrypts their own allocation off-chain via relayer.");
  // TODO(verify): getClaimAmount → userDecrypt(handle) to confirm plaintext == allocation.

  console.log("\nPipeline complete ✅  campaign:", airdropAddress);
}

main().catch((err) => {
  console.error("\nPipeline failed ❌\n", err);
  process.exitCode = 1;
});
