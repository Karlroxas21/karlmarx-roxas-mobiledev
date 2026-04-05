// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

/// @title RoxasToken (RXS) - ERC-20 with capped supply
/// @notice ERC-20 token with a hard cap of 10,000,000 RXS
/// @dev Inherits ERC20 and ERC20Capped from OpenZeppelin v5.
///      Minting logic deferred to Phase 4.
contract RoxasToken is ERC20, ERC20Capped {
    constructor()
        ERC20("Roxas Token", "RXS")
        ERC20Capped(10_000_000 * 10 ** 18)
    {}

    /// @dev Required override to resolve ERC20 vs ERC20Capped diamond.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
