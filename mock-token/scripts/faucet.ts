import { ethers } from "hardhat";

/**
 * Calls faucet() on the deployed cMockToken to self-serve confidential test tokens.
 * Requires MOCK_TOKEN_ADDRESS in env (or paste below).
 *
 * Usage:
 *   MOCK_TOKEN_ADDRESS=0x... pnpm faucet:sepolia
 */
async function main() {
  const tokenAddress = process.env.MOCK_TOKEN_ADDRESS;
  if (!tokenAddress) throw new Error("Set MOCK_TOKEN_ADDRESS in env first.");

  const [caller] = await ethers.getSigners();
  const token = await ethers.getContractAt("cMockToken", tokenAddress);

  console.log("Caller:", caller.address);
  const tx = await token.faucet();
  console.log("faucet() tx:", tx.hash);
  await tx.wait();
  console.log("Done — confidential balance topped up. Decrypt via the dApp to view.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
