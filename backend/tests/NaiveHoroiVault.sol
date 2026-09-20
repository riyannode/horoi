// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {HoroiVault} from "../HoroiVault.sol";

/// @title NaiveHoroiVault
/// @notice TEST/INCOMPATIBLE fixture that snapshots effective units at deposit.
/// @dev It intentionally preserves the wrong economic behavior for deterministic
///      conformance detection. It is not an external production protocol.
contract NaiveHoroiVault is HoroiVault {
    uint256 public immutable snapshotMultiplier;

    constructor(address configuredAsset, uint256 multiplierAtDeposit) HoroiVault(configuredAsset) {
        snapshotMultiplier = multiplierAtDeposit;
    }

    function effectiveClaimOf(address owner) external view returns (uint256) {
        return (rawClaimOf(owner) * snapshotMultiplier) / 1e18;
    }
}
