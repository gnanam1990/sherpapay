// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SherpaPayVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockVaultToken is ERC20 {
    constructor() ERC20("Test Token", "TT") {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SherpaPayVaultTest is Test {
    SherpaPayVault public vault;
    MockVaultToken public token;

    address public alice = makeAddr("alice");

    function setUp() public {
        vault = new SherpaPayVault();
        token = new MockVaultToken();
        token.transfer(alice, 100_000e18);
    }

    function testCreateGoal() public {
        vm.startPrank(alice);
        token.approve(address(vault), 1000e18);

        bytes32 id = vault.createGoal(
            address(token),
            1000e18,
            100e18,
            uint64(block.timestamp + 365 days),
            "Emergency Fund"
        );

        SherpaPayVault.Goal memory goal = vault.getGoal(id);
        assertEq(goal.owner, alice);
        assertEq(goal.token, address(token));
        assertEq(goal.targetAmount, 1000e18);
        assertEq(goal.currentAmount, 0);
        assertEq(goal.label, "Emergency Fund");
        assertFalse(goal.achieved);
        vm.stopPrank();
    }

    function testContribute() public {
        vm.startPrank(alice);
        token.approve(address(vault), 1000e18);

        bytes32 id = vault.createGoal(
            address(token),
            1000e18,
            100e18,
            uint64(block.timestamp + 365 days),
            "Emergency Fund"
        );

        vault.contribute(id, 250e18);
        assertEq(vault.getGoal(id).currentAmount, 250e18);

        uint256 progress = vault.getProgress(id);
        assertEq(progress, 2500); // 25% = 2500 bps
        vm.stopPrank();
    }

    function testGoalAchieved() public {
        vm.startPrank(alice);
        token.approve(address(vault), 1000e18);

        bytes32 id = vault.createGoal(
            address(token),
            1000e18,
            100e18,
            uint64(block.timestamp + 365 days),
            "Emergency Fund"
        );

        vault.contribute(id, 1000e18);
        assertTrue(vault.getGoal(id).achieved);
        vm.stopPrank();
    }

    function testWithdraw() public {
        vm.startPrank(alice);
        token.approve(address(vault), 1000e18);

        bytes32 id = vault.createGoal(
            address(token),
            1000e18,
            100e18,
            uint64(block.timestamp + 365 days),
            "Emergency Fund"
        );

        vault.contribute(id, 1000e18);

        uint256 balanceBefore = token.balanceOf(alice);
        vault.withdraw(id);
        uint256 balanceAfter = token.balanceOf(alice);

        assertEq(balanceAfter - balanceBefore, 1000e18);
        vm.stopPrank();
    }

    function testWithdrawBeforeAchievedReverts() public {
        vm.startPrank(alice);
        token.approve(address(vault), 1000e18);

        bytes32 id = vault.createGoal(
            address(token),
            1000e18,
            100e18,
            uint64(block.timestamp + 365 days),
            "Emergency Fund"
        );

        vault.contribute(id, 500e18);

        vm.expectRevert();
        vault.withdraw(id);
        vm.stopPrank();
    }

    function testEmergencyWithdraw() public {
        vm.startPrank(alice);
        token.approve(address(vault), 1000e18);

        bytes32 id = vault.createGoal(
            address(token),
            1000e18,
            100e18,
            uint64(block.timestamp + 365 days),
            "Emergency Fund"
        );

        vault.contribute(id, 500e18);

        uint256 balanceBefore = token.balanceOf(alice);
        vault.emergencyWithdraw(id);
        uint256 balanceAfter = token.balanceOf(alice);

        // 2% penalty on 500 = 10, so payout = 490
        assertEq(balanceAfter - balanceBefore, 490e18);
        vm.stopPrank();
    }

    function testDoubleWithdrawReverts() public {
        vm.startPrank(alice);
        token.approve(address(vault), 1000e18);

        bytes32 id = vault.createGoal(
            address(token),
            1000e18,
            100e18,
            uint64(block.timestamp + 365 days),
            "Emergency Fund"
        );

        vault.contribute(id, 1000e18);
        vault.withdraw(id);

        vm.expectRevert();
        vault.withdraw(id);
        vm.stopPrank();
    }

    function testGetUserGoals() public {
        vm.startPrank(alice);
        token.approve(address(vault), 10000e18);

        vault.createGoal(address(token), 500e18, 50e18, uint64(block.timestamp + 180 days), "Vacation");
        vault.createGoal(address(token), 2000e18, 200e18, uint64(block.timestamp + 365 days), "Car");

        bytes32[] memory userGoals = vault.getUserGoals(alice);
        assertEq(userGoals.length, 2);
        vm.stopPrank();
    }

    function testZeroAmountReverts() public {
        vm.prank(alice);
        vm.expectRevert(SherpaPayVault.ZeroAmount.selector);
        vault.createGoal(address(token), 0, 100e18, uint64(block.timestamp + 365 days), "Empty");
    }

    function testZeroAddressReverts() public {
        vm.prank(alice);
        vm.expectRevert(SherpaPayVault.ZeroAddress.selector);
        vault.createGoal(address(0), 1000e18, 100e18, uint64(block.timestamp + 365 days), "Bad Token");
    }
}
