// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/**
 * @title  cMockToken
 * @notice Demo-only confidential ERC-7984 token for the DropShield airdrop dApp.
 *
 *         This exists ONLY so we can fund a confidential airdrop campaign on Sepolia
 *         for the demo. If the official Zama cTokenMocks become usable on Sepolia,
 *         prefer those and delete this folder (see PRD §11).
 *
 *         Extends the canonical Zama `ERC7984Example` with an open, rate-limited
 *         `faucet()` so any tester can self-serve a fixed amount without the owner.
 *
 * @dev    Uses `ZamaEthereumConfig` per the Zama docs. The visible (clear-amount)
 *         mint is intentional for a public testnet faucet — transparency of the
 *         faucet drip is fine; real allocation amounts are encrypted later by the
 *         airdrop flow, which is what the bounty actually judges.
 */
contract cMockToken is ZamaEthereumConfig, ERC7984, Ownable2Step {
    /// @notice Fixed amount handed out per faucet call (raw token units).
    uint64 public immutable FAUCET_AMOUNT;

    /// @notice Minimum seconds between faucet drips per address.
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    /// @notice Last faucet timestamp per address.
    mapping(address => uint256) public lastFaucetAt;

    error FaucetCooldownActive(uint256 nextAllowedAt);

    event FaucetDrip(address indexed to, uint64 amount);

    /**
     * @param owner          Receives the initial supply and admin rights.
     * @param initialAmount  Clear initial mint to `owner` (raw units).
     * @param faucetAmount   Clear amount minted per `faucet()` call (raw units).
     * @param name_          Token name (e.g. "Confidential Mock USD").
     * @param symbol_        Token symbol (e.g. "cmUSD").
     * @param contractURI_   Optional metadata URI ("" is fine).
     */
    constructor(
        address owner,
        uint64 initialAmount,
        uint64 faucetAmount,
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    ) ERC7984(name_, symbol_, contractURI_) Ownable(owner) {
        FAUCET_AMOUNT = faucetAmount;
        if (initialAmount > 0) {
            _mint(owner, FHE.asEuint64(initialAmount));
        }
    }

    /**
     * @notice Self-serve a fixed amount of confidential test tokens.
     * @dev    Visible mint with a clear amount — appropriate for a public faucet.
     *         Rate-limited per address by `FAUCET_COOLDOWN`.
     */
    function faucet() external {
        uint256 next = lastFaucetAt[msg.sender] + FAUCET_COOLDOWN;
        if (block.timestamp < next) revert FaucetCooldownActive(next);
        lastFaucetAt[msg.sender] = block.timestamp;
        _mint(msg.sender, FHE.asEuint64(FAUCET_AMOUNT));
        emit FaucetDrip(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @notice Owner-only visible mint with a clear amount.
     */
    function mint(address to, uint64 amount) external onlyOwner {
        _mint(to, FHE.asEuint64(amount));
    }

    /**
     * @notice Owner-only confidential mint with an encrypted amount produced off-chain by the SDK.
     */
    function confidentialMint(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOwner {
        _mint(to, FHE.fromExternal(encryptedAmount, inputProof));
    }
}
