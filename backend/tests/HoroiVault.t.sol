// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {HoroiVault} from "../HoroiVault.sol";
import {NaiveHoroiVault} from "./NaiveHoroiVault.sol";

interface HoroiVm {
    function prank(address) external;
    function expectRevert(bytes4) external;
}

contract HoroiVaultTest {
    HoroiVm private constant vm = HoroiVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MockBStock private token;
    HoroiVault private vault;
    NaiveHoroiVault private naive;
    address private alice = address(0xA11CE);
    address private bob = address(0xB0B);
    address private attacker = address(0xBAD);

    function setUp() public {
        token = new MockBStock();
        vault = new HoroiVault(address(token));
        naive = new NaiveHoroiVault(address(token), 1e18);
        token.mint(alice, 1_000_000);
        token.mint(bob, 2_000_000);
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "uint mismatch");
    }

    function assertTrue(bool value) internal pure {
        require(value, "assertTrue");
    }

    function test_HarnessDepositRedeemTwoUsersAndFractional() public {
        vm.prank(alice);
        token.approve(address(vault), 123_457);
        vm.prank(alice);
        vault.deposit(123_457, alice);

        vm.prank(bob);
        token.approve(address(vault), 246_913);
        vm.prank(bob);
        vault.deposit(246_913, bob);

        assertEq(vault.rawClaimOf(alice), 123_457);
        assertEq(vault.rawClaimOf(bob), 246_913);
        assertEq(vault.totalRawAssets(), 370_370);

        uint256 aliceShares = vault.balanceOf(alice);
        vm.prank(alice);
        vault.redeem(aliceShares, alice, alice);
        assertEq(token.balanceOf(alice), 1_000_000);

        uint256 bobShares = vault.balanceOf(bob);
        vm.prank(bob);
        vault.redeem(bobShares, bob, bob);
        assertEq(token.balanceOf(bob), 2_000_000);
    }

    function test_HarnessUsesRawCanonicalAccounting() public {
        vm.prank(alice);
        token.approve(address(vault), 1_001);
        vm.prank(alice);
        vault.deposit(1_001, alice);
        assertEq(vault.rawClaimOf(alice), 1_001);
        assertEq(vault.totalRawAssets(), 1_001);
    }

    function test_UnauthorizedRedeemAndWithdrawPreserveState() public {
        vm.prank(alice);
        token.approve(address(vault), 123_457);
        vm.prank(alice);
        vault.deposit(123_457, alice);

        vm.prank(bob);
        token.approve(address(vault), 246_913);
        vm.prank(bob);
        vault.deposit(246_913, bob);

        uint256 aliceShares = vault.balanceOf(alice);
        uint256 bobShares = vault.balanceOf(bob);
        uint256 totalShares = vault.totalShares();
        uint256 totalRawAssets = vault.totalRawAssets();
        uint256 aliceAssets = token.balanceOf(alice);
        uint256 bobAssets = token.balanceOf(bob);
        uint256 vaultAssets = token.balanceOf(address(vault));
        uint256 attackerAssets = token.balanceOf(attacker);

        vm.expectRevert(HoroiVault.UnauthorizedOwner.selector);
        vm.prank(alice);
        vault.redeem(bobShares, attacker, bob);

        _assertState(
            aliceShares, bobShares, totalShares, totalRawAssets, aliceAssets, bobAssets, vaultAssets, attackerAssets
        );

        uint256 bobClaim = vault.rawClaimOf(bob);
        vm.expectRevert(HoroiVault.UnauthorizedOwner.selector);
        vm.prank(alice);
        vault.withdraw(bobClaim, attacker, bob);

        _assertState(
            aliceShares, bobShares, totalShares, totalRawAssets, aliceAssets, bobAssets, vaultAssets, attackerAssets
        );
    }

    function _assertState(
        uint256 aliceShares,
        uint256 bobShares,
        uint256 totalShares,
        uint256 totalRawAssets,
        uint256 aliceAssets,
        uint256 bobAssets,
        uint256 vaultAssets,
        uint256 attackerAssets
    ) internal view {
        assertEq(vault.balanceOf(alice), aliceShares);
        assertEq(vault.balanceOf(bob), bobShares);
        assertEq(vault.totalShares(), totalShares);
        assertEq(vault.totalRawAssets(), totalRawAssets);
        assertEq(token.balanceOf(alice), aliceAssets);
        assertEq(token.balanceOf(bob), bobAssets);
        assertEq(token.balanceOf(address(vault)), vaultAssets);
        assertEq(token.balanceOf(attacker), attackerAssets);
    }

    function test_IncompatibleFixtureDetectsStaleEffectiveSnapshot() public {
        vm.prank(alice);
        token.approve(address(naive), 1_000);
        vm.prank(alice);
        naive.deposit(1_000, alice);

        uint256 expectedAfterForwardSplit = (naive.rawClaimOf(alice) * 2e18) / 1e18;
        uint256 observedAfterForwardSplit = naive.effectiveClaimOf(alice);
        assertEq(observedAfterForwardSplit, 1_000);
        assertTrue(observedAfterForwardSplit != expectedAfterForwardSplit);
    }
}

contract MockBStock {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "allowance");
        require(balanceOf[from] >= amount, "balance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
