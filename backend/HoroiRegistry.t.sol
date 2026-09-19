// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {HoroiRegistry} from "./HoroiRegistry.sol";

interface Vm {
    function prank(address) external;
    function expectRevert(bytes4) external;
    function assume(bool) external;
    function deal(address, uint256) external;
    function warp(uint256) external;
}

contract HoroiRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    HoroiRegistry private reg;
    address private admin;
    address private publisher;
    address private publisher2;
    address private stranger;
    address private asset;
    address private target;
    bytes32 private suiteHash;
    bytes32 private resultHash;
    bytes32 private constant PUBLISHER = keccak256("PUBLISHER_ROLE");
    bytes32 private constant DEFAULT_ADMIN = bytes32(0);

    function setUp() public {
        admin = address(0xA11CE);
        publisher = address(0xB0B);
        publisher2 = address(0xB0B2);
        stranger = address(0xBAD);
        asset = address(0xA55E7);
        target = address(0x7A2E7);
        suiteHash = keccak256("suite");
        resultHash = keccak256("result");
        reg = new HoroiRegistry(admin);
        vm.prank(admin);
        reg.grantRole(PUBLISHER, publisher);
        vm.prank(admin);
        reg.grantRole(PUBLISHER, publisher2);
    }

    function assertTrue(bool value) internal pure {
        require(value, "assertTrue");
    }

    function assertFalse(bool value) internal pure {
        require(!value, "assertFalse");
    }

    function assertEq(address a, address b) internal pure {
        require(a == b, "address mismatch");
    }

    function assertEq(bytes32 a, bytes32 b) internal pure {
        require(a == b, "bytes32 mismatch");
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "uint mismatch");
    }

    function assertGt(uint256 a, uint256 b) internal pure {
        require(a > b, "not greater");
    }

    function _publishBy(address who, bytes32 rh) internal returns (bytes32 id) {
        vm.prank(who);
        id = reg.publish(asset, target, suiteHash, rh, 123, 1);
    }

    function test_R001_deploy_assigns_admin() public view {
        assertTrue(reg.hasRole(DEFAULT_ADMIN, admin));
        assertTrue(reg.hasRole(PUBLISHER, admin));
    }

    function test_R002_admin_can_grant_publisher() public {
        address extra = address(0xE11A);
        vm.prank(admin);
        reg.grantRole(PUBLISHER, extra);
        assertTrue(reg.hasRole(PUBLISHER, extra));
    }

    function test_R003_non_publisher_cannot_publish() public {
        vm.prank(stranger);
        vm.expectRevert(HoroiRegistry.NotPublisher.selector);
        reg.publish(asset, target, suiteHash, resultHash, 1, 1);
    }

    function test_R004_publisher_can_publish_pass() public {
        bytes32 id = _publishBy(publisher, resultHash);
        (address a, address t, bytes32 s, bytes32 r, uint64 b,, uint8 st, address p) = reg.reports(id);
        assertEq(a, asset);
        assertEq(t, target);
        assertEq(s, suiteHash);
        assertEq(r, resultHash);
        assertEq(b, 123);
        assertEq(st, 1);
        assertEq(p, publisher);
        assertTrue(reg.exists(id));
    }

    function test_R005_publisher_can_publish_fail() public {
        vm.prank(publisher);
        bytes32 id = reg.publish(asset, target, suiteHash, keccak256("fail"), 5, 2);
        (,,,,,, uint8 st,) = reg.reports(id);
        assertEq(st, 2);
    }

    function test_R006_publisher_can_publish_incomplete() public {
        vm.prank(publisher);
        bytes32 id = reg.publish(asset, target, suiteHash, keccak256("inc"), 6, 3);
        (,,,,,, uint8 st,) = reg.reports(id);
        assertEq(st, 3);
    }

    function test_R007_invalid_status_reverts() public {
        vm.prank(publisher);
        vm.expectRevert(HoroiRegistry.InvalidStatus.selector);
        reg.publish(asset, target, suiteHash, resultHash, 1, 0);
    }

    function test_R008_zero_asset_reverts() public {
        vm.prank(publisher);
        vm.expectRevert(HoroiRegistry.InvalidAsset.selector);
        reg.publish(address(0), target, suiteHash, resultHash, 1, 1);
    }

    function test_R009_zero_suite_hash_reverts() public {
        vm.prank(publisher);
        vm.expectRevert(HoroiRegistry.InvalidHashes.selector);
        reg.publish(asset, target, bytes32(0), resultHash, 1, 1);
    }

    function test_R010_zero_result_hash_reverts() public {
        vm.prank(publisher);
        vm.expectRevert(HoroiRegistry.InvalidHashes.selector);
        reg.publish(asset, target, suiteHash, bytes32(0), 1, 1);
    }

    function test_R011_duplicate_report_reverts() public {
        _publishBy(publisher, resultHash);
        vm.prank(publisher);
        vm.expectRevert(HoroiRegistry.AlreadyPublished.selector);
        reg.publish(asset, target, suiteHash, resultHash, 123, 1);
    }

    function test_R012_report_fields_round_trip() public {
        vm.warp(1_800_000_000);
        bytes32 id = _publishBy(publisher, resultHash);
        (address a, address t, bytes32 s, bytes32 r, uint64 b, uint64 at, uint8 st, address p) = reg.reports(id);
        assertEq(a, asset);
        assertEq(t, target);
        assertEq(s, suiteHash);
        assertEq(r, resultHash);
        assertEq(b, 123);
        assertEq(at, 1_800_000_000);
        assertEq(st, 1);
        assertEq(p, publisher);
    }

    function test_R013_report_id_matches_offchain() public {
        bytes32 id = _publishBy(publisher, resultHash);
        bytes32 expected = keccak256(abi.encode(block.chainid, asset, target, suiteHash, resultHash, uint64(123)));
        assertEq(id, expected);
    }

    function test_R014_stranger_cannot_revoke() public {
        bytes32 id = _publishBy(publisher, resultHash);
        vm.prank(stranger);
        vm.expectRevert(HoroiRegistry.NotAdmin.selector);
        reg.revoke(id);
    }

    function test_R015_publisher_cannot_revoke_own_report() public {
        bytes32 id = _publishBy(publisher, resultHash);
        vm.prank(publisher);
        vm.expectRevert(HoroiRegistry.NotAdmin.selector);
        reg.revoke(id);
    }

    function test_R016_publisher_cannot_revoke_other_report() public {
        bytes32 id = _publishBy(publisher, resultHash);
        vm.prank(publisher2);
        vm.expectRevert(HoroiRegistry.NotAdmin.selector);
        reg.revoke(id);
    }

    function test_R017_admin_revoke_marks_revoked() public {
        bytes32 id = _publishBy(publisher, resultHash);
        vm.prank(admin);
        reg.revoke(id);
        assertTrue(reg.revoked(id));
        assertFalse(reg.exists(id));
    }

    function test_R018_revoke_keeps_history() public {
        bytes32 id = _publishBy(publisher, resultHash);
        vm.prank(admin);
        reg.revoke(id);
        (address a,,,,,,,) = reg.reports(id);
        assertEq(a, asset);
    }

    function test_R019_double_revoke_reverts() public {
        bytes32 id = _publishBy(publisher, resultHash);
        vm.prank(admin);
        reg.revoke(id);
        vm.prank(admin);
        vm.expectRevert(HoroiRegistry.AlreadyRevoked.selector);
        reg.revoke(id);
    }

    function test_R020_zero_target_allowed_token_only() public {
        vm.prank(publisher);
        bytes32 id = reg.publish(asset, address(0), suiteHash, keccak256("token-only"), 9, 1);
        (, address t,,,,,,) = reg.reports(id);
        assertEq(t, address(0));
    }

    function test_R021_fuzz_valid_publish(bytes32 sh, bytes32 rh, uint64 blockNum, uint8 status) public {
        vm.assume(sh != bytes32(0));
        vm.assume(rh != bytes32(0));
        vm.assume(status >= 1 && status <= 3);
        vm.prank(publisher);
        bytes32 id = reg.publish(asset, target, sh, rh, blockNum, status);
        assertTrue(reg.exists(id));
    }

    function test_R022_no_eth_custody() public {
        bytes32 id = _publishBy(publisher, resultHash);
        assertEq(address(reg).balance, 0);
        assertTrue(reg.exists(id));
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        (bool ok,) = address(reg).call{value: 1 wei}("");
        assertFalse(ok);
        assertEq(address(reg).balance, 0);
    }
}
