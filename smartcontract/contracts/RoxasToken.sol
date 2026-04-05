// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

/// @title RoxasToken (RXS) - ERC-20 with capped supply and public minting
/// @notice ERC-20 token with a hard cap of 10,000,000 RXS and public minting with per-address cooldown
/// @dev Inherits ERC20 and ERC20Capped from OpenZeppelin v5.
///      Cap enforcement handled by ERC20Capped._update() -- no manual cap check in mint().
contract RoxasToken is ERC20, ERC20Capped {
    // --- Constants ---
    uint256 public constant MINT_LIMIT = 1000 * 10 ** 18;
    uint256 public constant COOLDOWN_PERIOD = 60;
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;

    // --- Storage ---
    mapping(address => uint256) private _lastMintTimestamp;

    // --- Events ---
    event TokensMinted(address indexed minter, uint256 amount);

    // --- Errors ---
    error MintLimitExceeded(uint256 amount, uint256 limit);
    error CooldownNotElapsed(uint256 remaining);

    constructor()
        ERC20("Roxas Token", "RXS")
        ERC20Capped(10_000_000 * 10 ** 18)
    {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /// @notice Mint RXS tokens to the caller
    /// @param amount The number of tokens to mint (in wei, max 1000 * 10**18)
    function mint(uint256 amount) external {
        if (amount == 0 || amount > MINT_LIMIT) {
            revert MintLimitExceeded(amount, MINT_LIMIT);
        }

        uint256 lastMint = _lastMintTimestamp[msg.sender];
        if (block.timestamp < lastMint + COOLDOWN_PERIOD) {
            revert CooldownNotElapsed(lastMint + COOLDOWN_PERIOD - block.timestamp);
        }

        _lastMintTimestamp[msg.sender] = block.timestamp;

        _mint(msg.sender, amount);

        emit TokensMinted(msg.sender, amount);
    }

    /// @notice Returns seconds until the address can mint again (0 if ready)
    /// @param account The address to check
    /// @return remaining Seconds remaining in cooldown (0 if no cooldown active)
    function cooldownRemaining(address account) external view returns (uint256 remaining) {
        uint256 lastMint = _lastMintTimestamp[account];
        uint256 nextMintTime = lastMint + COOLDOWN_PERIOD;
        if (block.timestamp < nextMintTime) {
            remaining = nextMintTime - block.timestamp;
        }
    }

    /// @dev Required override to resolve ERC20 vs ERC20Capped diamond.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
