// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {HoroiVault} from "../HoroiVault.sol";
import {NaiveHoroiVault} from "./NaiveHoroiVault.sol";

interface HoroiVm {
    function prank(address) external;
}

contract HoroiVaultTest {
    HoroiVm private constant vm = HoroiVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MockBStock private token;
    HoroiVault private vault;
    NaiveHoroiVault private naive;
    address private alice = address(0xA11CE);
    address private bob = address(0xB0B);

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

        vm.prank(alice);
        vault.redeem(vault.balanceOf(alice), alice, alice);
        assertEq(token.balanceOf(alice), 1_000_000);

        vm.prank(bob);
        vault.redeem(vault.balanceOf(bob), bob, bob);
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
