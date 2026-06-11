import { ethers } from "hardhat";

/**
 * Deploys the demo confidential ERC-7984 mock token (cMockToken) to Sepolia.
 *
 * Decimals: ERC-7984 confidential tokens conventionally use 6 decimals, so
 *   1 token = 1_000_000 raw units (matches the TokenOps airdrop SDK examples).
 *
 * Usage:
 *   pnpm deploy:sepolia
 * Then copy the printed address into the dApp's .env as VITE_MOCK_TOKEN_ADDRESS.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const ONE = 1_000_000n; // 1 token at 6 decimals
  const initialAmount = 1_000_000n * ONE; // 1,000,000 tokens to deployer
  const faucetAmount = 1_000n * ONE; // 1,000 tokens per faucet() call

  const Factory = await ethers.getContractFactory("cMockToken");
  const token = await Factory.deploy(
    deployer.address,
    initialAmount,
    faucetAmount,
    "Confidential Mock USD",
    "cmUSD",
    ""
  );
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("cMockToken deployed:", address);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Add to dApp .env:  VITE_MOCK_TOKEN_ADDRESS=${address}`);
  console.log(`  2. Verify:            npx hardhat verify --network sepolia ${address} \\`);
  console.log(`        ${deployer.address} ${initialAmount} ${faucetAmount} "Confidential Mock USD" "cmUSD" ""`);
  console.log(`  3. Testers call faucet() to self-serve ${faucetAmount / ONE} cmUSD (1h cooldown).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
