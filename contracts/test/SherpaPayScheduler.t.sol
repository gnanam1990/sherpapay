// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SherpaPayScheduler.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SherpaPaySchedulerTest is Test {
    SherpaPayScheduler public scheduler;
    MockERC20 public token;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public worker = makeAddr("worker");

    uint64 public constant INTERVAL = 1 hours;
    uint8 public constant MAX_FAILURES = 3;

    function setUp() public {
        scheduler = new SherpaPayScheduler();
        token = new MockERC20("Test Token", "TT");

        token.transfer(alice, 100_000e18);
        token.transfer(bob, 100_000e18);
    }

    function testSchedulePayment() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 1000e18);

        bytes32 id = scheduler.schedulePayment(
            bob, address(token), 100e18, uint64(block.timestamp + 1 hours), INTERVAL, 0, MAX_FAILURES
        );

        SherpaPayScheduler.Schedule memory schedule = scheduler.getSchedule(id);
        assertEq(schedule.sender, alice);
        assertEq(schedule.recipient, bob);
        assertEq(schedule.token, address(token));
        assertEq(schedule.amount, 100e18);
        assertEq(schedule.remainingBalance, 100e18);
        assertEq(uint8(schedule.status), uint8(SherpaPayScheduler.ScheduleStatus.Active));
        vm.stopPrank();
    }

    function testFundSchedule() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 1000e18);

        bytes32 id = scheduler.schedulePayment(
            bob, address(token), 100e18, uint64(block.timestamp + 1 hours), INTERVAL, 0, MAX_FAILURES
        );

        scheduler.fundSchedule(id, 300e18);

        SherpaPayScheduler.Schedule memory schedule = scheduler.getSchedule(id);
        assertEq(schedule.remainingBalance, 400e18);
        assertEq(token.balanceOf(address(scheduler)), 400e18);
        vm.stopPrank();
    }

    function testFundScheduleRejectsUnauthorizedSender() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 1000e18);
        bytes32 id = scheduler.schedulePayment(
            bob, address(token), 100e18, uint64(block.timestamp + 1 hours), INTERVAL, 0, MAX_FAILURES
        );
        vm.stopPrank();

        vm.startPrank(bob);
        token.approve(address(scheduler), 100e18);
        vm.expectRevert(SherpaPayScheduler.Unauthorized.selector);
        scheduler.fundSchedule(id, 100e18);
        vm.stopPrank();
    }

    function testExecuteDuePayment() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 1000e18);

        uint64 startTime = uint64(block.timestamp + 1 hours);
        bytes32 id = scheduler.schedulePayment(bob, address(token), 100e18, startTime, INTERVAL, 0, MAX_FAILURES);
        vm.stopPrank();

        // Fast forward to execution time
        vm.warp(startTime);

        uint256 bobBalanceBefore = token.balanceOf(bob);
        scheduler.executeDuePayment(id);
        uint256 bobBalanceAfter = token.balanceOf(bob);

        assertEq(bobBalanceAfter - bobBalanceBefore, 100e18);

        SherpaPayScheduler.Schedule memory schedule = scheduler.getSchedule(id);
        assertEq(schedule.lastExecution, startTime);
        assertEq(schedule.nextExecution, startTime + INTERVAL);
        assertEq(schedule.remainingBalance, 0);
    }

    function testExecuteBatch() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 10000e18);

        uint64 startTime = uint64(block.timestamp + 1 hours);
        bytes32 id1 = scheduler.schedulePayment(bob, address(token), 50e18, startTime, INTERVAL, 0, MAX_FAILURES);
        bytes32 id2 = scheduler.schedulePayment(bob, address(token), 75e18, startTime, INTERVAL, 0, MAX_FAILURES);
        vm.stopPrank();

        vm.warp(startTime);

        bytes32[] memory ids = new bytes32[](2);
        ids[0] = id1;
        ids[1] = id2;

        uint256 bobBefore = token.balanceOf(bob);
        scheduler.executeBatch(ids);
        uint256 bobAfter = token.balanceOf(bob);

        assertEq(bobAfter - bobBefore, 125e18);
        assertEq(scheduler.getSchedule(id1).remainingBalance, 0);
        assertEq(scheduler.getSchedule(id2).remainingBalance, 0);
    }

    function testPauseAndResume() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 1000e18);

        bytes32 id =
            scheduler.schedulePayment(bob, address(token), 100e18, uint64(block.timestamp), INTERVAL, 0, MAX_FAILURES);

        scheduler.pauseSchedule(id);
        assertEq(uint8(scheduler.getSchedule(id).status), uint8(SherpaPayScheduler.ScheduleStatus.Paused));

        scheduler.resumeSchedule(id);
        assertEq(uint8(scheduler.getSchedule(id).status), uint8(SherpaPayScheduler.ScheduleStatus.Active));
        vm.stopPrank();
    }

    function testCancelSchedule() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 1000e18);

        bytes32 id =
            scheduler.schedulePayment(bob, address(token), 100e18, uint64(block.timestamp), INTERVAL, 0, MAX_FAILURES);

        scheduler.cancelSchedule(id);
        SherpaPayScheduler.Schedule memory schedule = scheduler.getSchedule(id);
        assertEq(uint8(schedule.status), uint8(SherpaPayScheduler.ScheduleStatus.Cancelled));
        assertEq(schedule.remainingBalance, 0);
        vm.stopPrank();
    }

    function testCancelScheduleRefundsOnlyItsOwnEscrow() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 1000e18);
        bytes32 aliceSchedule = scheduler.schedulePayment(
            worker, address(token), 100e18, uint64(block.timestamp), INTERVAL, 0, MAX_FAILURES
        );
        vm.stopPrank();

        vm.startPrank(bob);
        token.approve(address(scheduler), 1000e18);
        bytes32 bobSchedule = scheduler.schedulePayment(
            worker, address(token), 200e18, uint64(block.timestamp), INTERVAL, 0, MAX_FAILURES
        );
        vm.stopPrank();

        uint256 aliceBefore = token.balanceOf(alice);
        vm.prank(alice);
        scheduler.cancelSchedule(aliceSchedule);

        assertEq(token.balanceOf(alice) - aliceBefore, 100e18);
        assertEq(token.balanceOf(address(scheduler)), 200e18);
        assertEq(scheduler.getSchedule(aliceSchedule).remainingBalance, 0);
        assertEq(scheduler.getSchedule(bobSchedule).remainingBalance, 200e18);

        uint256 workerBefore = token.balanceOf(worker);
        scheduler.executeDuePayment(bobSchedule);
        assertEq(token.balanceOf(worker) - workerBefore, 200e18);
        assertEq(scheduler.getSchedule(bobSchedule).remainingBalance, 0);
    }

    function testAutoPauseAfterMaxFailures() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 1000e18);

        uint64 startTime = uint64(block.timestamp + 1 hours);
        bytes32 id = scheduler.schedulePayment(bob, address(token), 100e18, startTime, INTERVAL, 0, 2);
        vm.stopPrank();

        vm.warp(startTime);
        scheduler.executeDuePayment(id);
        vm.warp(startTime + INTERVAL);

        // First failure - increments failure count
        scheduler.executeDuePayment(id);
        assertEq(scheduler.getSchedule(id).currentFailures, 1);

        // Second failure should auto-pause (maxFailures=2)
        scheduler.executeDuePayment(id);
        assertEq(uint8(scheduler.getSchedule(id).status), uint8(SherpaPayScheduler.ScheduleStatus.Paused));
    }

    function testZeroAmountReverts() public {
        vm.prank(alice);
        vm.expectRevert(SherpaPayScheduler.ZeroAmount.selector);
        scheduler.schedulePayment(bob, address(token), 0, uint64(block.timestamp), INTERVAL, 0, MAX_FAILURES);
    }

    function testZeroAddressReverts() public {
        vm.prank(alice);
        vm.expectRevert(SherpaPayScheduler.ZeroAddress.selector);
        scheduler.schedulePayment(
            address(0), address(token), 100e18, uint64(block.timestamp), INTERVAL, 0, MAX_FAILURES
        );
    }

    function testInvalidIntervalReverts() public {
        vm.prank(alice);
        vm.expectRevert(SherpaPayScheduler.InvalidInterval.selector);
        scheduler.schedulePayment(bob, address(token), 100e18, uint64(block.timestamp), 60, 0, MAX_FAILURES);
    }

    function testUnauthorizedPauseReverts() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 1000e18);
        bytes32 id =
            scheduler.schedulePayment(bob, address(token), 100e18, uint64(block.timestamp), INTERVAL, 0, MAX_FAILURES);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert(SherpaPayScheduler.Unauthorized.selector);
        scheduler.pauseSchedule(id);
    }

    function testGetActiveSchedules() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 10000e18);
        scheduler.schedulePayment(bob, address(token), 50e18, uint64(block.timestamp), INTERVAL, 0, MAX_FAILURES);
        scheduler.schedulePayment(bob, address(token), 75e18, uint64(block.timestamp), INTERVAL, 0, MAX_FAILURES);
        vm.stopPrank();

        bytes32[] memory active = scheduler.getActiveSchedules(alice);
        assertEq(active.length, 2);
    }

    function testGetDueSchedules() public {
        vm.startPrank(alice);
        token.approve(address(scheduler), 10000e18);
        uint64 startTime = uint64(block.timestamp + 1 hours);
        scheduler.schedulePayment(bob, address(token), 50e18, startTime, INTERVAL, 0, MAX_FAILURES);
        scheduler.schedulePayment(bob, address(token), 75e18, startTime, INTERVAL, 0, MAX_FAILURES);
        vm.stopPrank();

        vm.warp(startTime);

        bytes32[] memory due = scheduler.getDueSchedules(10);
        assertEq(due.length, 2);
    }
}
