// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SherpaPayVault
/// @notice Savings goals with auto-DCA on Celo
contract SherpaPayVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Structs ─────────────────────────────────────────────────────────

    struct Goal {
        address owner;
        address token;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 monthlyContribution;
        uint64 startTime;
        uint64 targetDate;
        string label;
        bool achieved;
        bool emergencyWithdrawn;
    }

    // ─── State ───────────────────────────────────────────────────────────

    mapping(bytes32 => Goal) private goals;
    mapping(address => bytes32[]) private userGoals;
    bytes32[] private allGoalIds;

    address public owner;
    uint256 public emergencyPenaltyBps; // e.g., 200 = 2%

    // ─── Events ──────────────────────────────────────────────────────────

    event GoalCreated(
        bytes32 indexed id,
        address indexed owner,
        address token,
        uint256 targetAmount,
        uint256 monthlyContribution,
        uint64 targetDate,
        string label
    );

    event ContributionMade(bytes32 indexed id, uint256 amount, uint256 newTotal);

    event GoalAchieved(bytes32 indexed id, uint256 totalAmount);

    event Withdrawal(bytes32 indexed id, uint256 amount);

    event EmergencyWithdrawal(bytes32 indexed id, uint256 amount, uint256 penalty);

    // ─── Errors ──────────────────────────────────────────────────────────

    error ZeroAmount();
    error ZeroAddress();
    error GoalNotFound();
    error GoalNotAchieved();
    error GoalAlreadyAchieved();
    error AlreadyWithdrawn();
    error TargetDateNotReached();

    // ─── Modifiers ───────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert();
        _;
    }

    modifier goalExists(bytes32 goalId) {
        if (goals[goalId].owner == address(0)) revert GoalNotFound();
        _;
    }

    modifier onlyGoalOwner(bytes32 goalId) {
        if (goals[goalId].owner != msg.sender) revert();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        emergencyPenaltyBps = 200; // 2% penalty
    }

    // ─── Core Functions ──────────────────────────────────────────────────

    /// @notice Create a new savings goal
    /// @param token ERC-20 token address
    /// @param target Target amount to save
    /// @param monthly Monthly contribution amount
    /// @param targetDate Target completion date
    /// @param label Human-readable label for the goal
    /// @return goalId Unique identifier for the goal
    function createGoal(
        address token,
        uint256 target,
        uint256 monthly,
        uint64 targetDate,
        string memory label
    ) external nonReentrant returns (bytes32 goalId) {
        if (target == 0) revert ZeroAmount();
        if (token == address(0)) revert ZeroAddress();
        if (bytes(label).length == 0) revert();

        goalId = keccak256(
            abi.encodePacked(msg.sender, token, target, block.timestamp)
        );

        goals[goalId] = Goal({
            owner: msg.sender,
            token: token,
            targetAmount: target,
            currentAmount: 0,
            monthlyContribution: monthly,
            startTime: uint64(block.timestamp),
            targetDate: targetDate,
            label: label,
            achieved: false,
            emergencyWithdrawn: false
        });

        userGoals[msg.sender].push(goalId);
        allGoalIds.push(goalId);

        emit GoalCreated(goalId, msg.sender, token, target, monthly, targetDate, label);
    }

    /// @notice Contribute to a savings goal
    /// @param goalId The goal to contribute to
    /// @param amount Amount to contribute
    function contribute(bytes32 goalId, uint256 amount) external nonReentrant goalExists(goalId) {
        if (amount == 0) revert ZeroAmount();
        Goal storage goal = goals[goalId];
        if (goal.achieved) revert GoalAlreadyAchieved();

        IERC20(goal.token).safeTransferFrom(msg.sender, address(this), amount);
        goal.currentAmount += amount;

        emit ContributionMade(goalId, amount, goal.currentAmount);

        if (goal.currentAmount >= goal.targetAmount) {
            goal.achieved = true;
            emit GoalAchieved(goalId, goal.currentAmount);
        }
    }

    /// @notice Withdraw from an achieved goal
    /// @param goalId The goal to withdraw from
    function withdraw(bytes32 goalId) external nonReentrant goalExists(goalId) onlyGoalOwner(goalId) {
        Goal storage goal = goals[goalId];
        if (!goal.achieved) revert GoalNotAchieved();
        if (goal.emergencyWithdrawn) revert AlreadyWithdrawn();

        uint256 amount = goal.currentAmount;
        goal.currentAmount = 0;
        goal.emergencyWithdrawn = true;

        IERC20(goal.token).safeTransfer(msg.sender, amount);

        emit Withdrawal(goalId, amount);
    }

    /// @notice Emergency withdrawal with penalty (2%)
    /// @dev Can withdraw before target date, but pays penalty
    /// @param goalId The goal to withdraw from
    function emergencyWithdraw(bytes32 goalId) external nonReentrant goalExists(goalId) onlyGoalOwner(goalId) {
        Goal storage goal = goals[goalId];
        if (goal.emergencyWithdrawn) revert AlreadyWithdrawn();

        uint256 amount = goal.currentAmount;
        uint256 penalty = (amount * emergencyPenaltyBps) / 10000;
        uint256 payout = amount - penalty;

        goal.currentAmount = 0;
        goal.emergencyWithdrawn = true;

        IERC20(goal.token).safeTransfer(msg.sender, payout);

        // Penalty stays in contract (can be redistributed or burned)
        emit EmergencyWithdrawal(goalId, payout, penalty);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    /// @notice Get goal details
    /// @param goalId The goal ID
    /// @return The Goal struct
    function getGoal(bytes32 goalId) external view goalExists(goalId) returns (Goal memory) {
        return goals[goalId];
    }

    /// @notice Get all goal IDs for a user
    /// @param user The user address
    /// @return Array of goal IDs
    function getUserGoals(address user) external view returns (bytes32[] memory) {
        return userGoals[user];
    }

    /// @notice Get progress percentage for a goal
    /// @param goalId The goal ID
    /// @return Progress in basis points (10000 = 100%)
    function getProgress(bytes32 goalId) external view goalExists(goalId) returns (uint256) {
        Goal storage goal = goals[goalId];
        if (goal.targetAmount == 0) return 0;
        return (goal.currentAmount * 10000) / goal.targetAmount;
    }

    /// @notice Get total number of goals
    function getTotalGoals() external view returns (uint256) {
        return allGoalIds.length;
    }
}
