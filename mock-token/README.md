# DropShield — Mock Confidential Token (`cMockToken`)

**Demo-only.** A confidential ERC-7984 token with an open, rate-limited faucet, so we can fund a
confidential airdrop campaign on Sepolia for the DropShield demo.

> **Why this exists:** The bounty's confidential airdrop needs an ERC-7984 token to distribute.
> Zama maintains official **cTokenMocks** on Sepolia, but (a) their Sepolia addresses are not
> published anywhere indexable yet, and (b) the cUSDC/cUSDT/cWETH wrappers were **recently paused**
> after the Circle freeze incident. Rather than block the build, we ship our own mock. If/when an
> official Sepolia cTokenMock is confirmed usable, prefer it and delete this folder. The dApp reads
> the token address from an env var (`VITE_MOCK_TOKEN_ADDRESS`), so swapping is a one-line change.

The contract is the canonical Zama [`ERC7984Example`](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984)
extended with:
- `faucet()` — anyone self-serves a fixed amount (1h cooldown per address)
- `mint(to, amount)` — owner visible mint
- `confidentialMint(to, encryptedAmount, inputProof)` — owner encrypted mint

Uses **6 decimals** (ERC-7984 convention): `1 token = 1_000_000` raw units.

## Setup

Requires **Node ≥ 22**.

```bash
cd mock-token
pnpm install
cp .env.example .env   # fill PRIVATE_KEY + RPC_URL
pnpm compile
```

## Deploy to Sepolia

```bash
pnpm deploy:sepolia
```

Copy the printed address into the dApp's `.env`:

```
VITE_MOCK_TOKEN_ADDRESS=0x...
```

## Get test tokens

Either run the script:

```bash
MOCK_TOKEN_ADDRESS=0x... pnpm faucet:sepolia
```

…or call `faucet()` from the dApp / Etherscan. Default drip: **1,000 cmUSD**, 1h cooldown.

## Verify dependency versions before installing

The dep versions in `package.json` are best-effort pins; confirm the current
`@fhevm/solidity`, `@fhevm/hardhat-plugin`, and `@openzeppelin/confidential-contracts`
versions against the Zama docs at deploy time (they move fast). The contract source itself
matches the documented `ERC7984Example` API (`FHE.asEuint64`, `FHE.fromExternal`, `_mint`).
