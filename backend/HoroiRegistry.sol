// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title HoroiRegistry
/// @notice Anchors immutable summaries of Horoi conformance reports on BSC.
/// @dev No custody, arbitrary execution, external calls, or upgradeability.
contract HoroiRegistry is AccessControl {
    bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");

    uint8 public constant STATUS_PASS = 1;
    uint8 public constant STATUS_FAIL = 2;
    uint8 public constant STATUS_INCOMPLETE = 3;

    struct Report {
        address asset;
        address target;
        bytes32 suiteHash;
        bytes32 resultHash;
        uint64 blockNumber;
        uint64 testedAt;
        uint8 status;
        address publisher;
    }

    mapping(bytes32 => Report) public reports;
    mapping(bytes32 => bool) public revoked;

    event ReportPublished(
        bytes32 indexed reportId,
        address indexed asset,
        address indexed target,
        bytes32 suiteHash,
        bytes32 resultHash,
        uint64 blockNumber,
        uint8 status,
        address publisher
    );
    event ReportRevoked(bytes32 indexed reportId, address indexed revokedBy);

    error InvalidAdmin();
    error NotPublisher();
    error NotAdmin();
    error InvalidAsset();
    error InvalidHashes();
    error InvalidStatus();
    error AlreadyPublished();
    error NotPublished();
    error AlreadyRevoked();

    constructor(address admin) {
        if (admin == address(0)) revert InvalidAdmin();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PUBLISHER_ROLE, admin);
    }

    function publish(
        address asset,
        address target,
        bytes32 suiteHash,
        bytes32 resultHash,
        uint64 blockNumber,
        uint8 status
    ) external returns (bytes32 reportId) {
        if (!hasRole(PUBLISHER_ROLE, msg.sender)) revert NotPublisher();
        if (asset == address(0)) revert InvalidAsset();
        if (suiteHash == bytes32(0) || resultHash == bytes32(0)) revert InvalidHashes();
        if (status < STATUS_PASS || status > STATUS_INCOMPLETE) revert InvalidStatus();

        reportId = keccak256(abi.encode(block.chainid, asset, target, suiteHash, resultHash, blockNumber));
        if (reports[reportId].publisher != address(0)) revert AlreadyPublished();

        reports[reportId] = Report({
            asset: asset,
            target: target,
            suiteHash: suiteHash,
            resultHash: resultHash,
            blockNumber: blockNumber,
            testedAt: uint64(block.timestamp),
            status: status,
            publisher: msg.sender
        });

        emit ReportPublished(reportId, asset, target, suiteHash, resultHash, blockNumber, status, msg.sender);
    }

    /// @notice Revoke a publication without deleting its immutable report history.
    /// @dev Admin-only so one compromised publisher cannot revoke another publisher's reports.
    function revoke(bytes32 reportId) external {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert NotAdmin();
        if (reports[reportId].publisher == address(0)) revert NotPublished();
        if (revoked[reportId]) revert AlreadyRevoked();
        revoked[reportId] = true;
        emit ReportRevoked(reportId, msg.sender);
    }

    function exists(bytes32 reportId) external view returns (bool) {
        return reports[reportId].publisher != address(0) && !revoked[reportId];
    }
}
