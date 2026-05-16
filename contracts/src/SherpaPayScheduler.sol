// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SherpaPayScheduler
/// @notice Manages scheduled recurring payments on Celo
/// @dev Supports cUSD, cEUR, USDT token payments
contract SherpaPayScheduler is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Enums ───────────────────────────────────────────────────────────

    enum ScheduleStatus {
        Active, // 0
        Paused, // 1
        Cancelled, // 2
        Expired // 3
    }

    // ─── Structs ─────────────────────────────────────────────────────────

    struct Schedule {
        address sender; // User who scheduled
        address recipient; // Where money goes
        address token; // cUSD, cEUR, USDT
        uint256 amount; // Per-execution amount (wei)
        uint64 startTime; // First execution
        uint64 interval; // Seconds between executions
        uint64 endTime; // 0 = perpetual
        uint8 maxFailures; // Auto-pause after N failures
        uint8 currentFailures;
        ScheduleStatus status;
        uint64 lastExecution; // Last successful execution
        uint64 nextExecution; // Calculated next execution
    }

    // ─── State ───────────────────────────────────────────────────────────

    mapping(bytes32 => Schedule) private schedules;
    mapping(address => bytes32[]) private userSchedules;
    bytes32[] private allScheduleIds;

    address public owner;
    uint256 public maxSchedulesPerUser;

    // ─── Events ──────────────────────────────────────────────────────────

    event ScheduleCreated(
        bytes32 indexed id,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 amount,
        uint64 interval,
        uint64 startTime,
        uint64 endTime
    );

    event ExecutionSuccess(
        bytes32 indexed id,
        uint256 amount,
        uint64 nextExecution
    );

    event ExecutionFailed(bytes32 indexed id, string reason);

    event ScheduleCancelled(bytes32 indexed id);

    event SchedulePaused(bytes32 indexed id);

    event ScheduleResumed(bytes32 indexed id);

    // ─── Errors ──────────────────────────────────────────────────────────

    error ZeroAmount();
    error ZeroAddress();
    error InvalidInterval();
    error InvalidTimeRange();
    error ScheduleNotFound();
    error ScheduleNotActive();
    error Unauthorized();
    error MaxFailuresExceeded();
    error NotDue();
    error TransferFailed();

    // ─── Modifiers ───────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlySender(bytes32 scheduleId) {
        if (schedules[scheduleId].sender != msg.sender) revert Unauthorized();
        _;
    }

    modifier scheduleExists(bytes32 scheduleId) {
        if (schedules[scheduleId].sender == address(0)) revert ScheduleNotFound();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        maxSchedulesPerUser = 50;
    }

    // ─── Core Functions ──────────────────────────────────────────────────

    /// @notice Create a new scheduled payment
    /// @param recipient Address to send to
    /// @param token ERC-20 token address (cUSD, cEUR, USDT)
    /// @param amount Amount per execution in wei
    /// @param startTime First execution timestamp
    /// @param interval Seconds between executions
    /// @param endTime End timestamp (0 for perpetual)
    /// @param maxFailures Auto-pause after this many failures
    /// @return scheduleId Unique identifier for the schedule
    function schedulePayment(
        address recipient,
        address token,
        uint256 amount,
        uint64 startTime,
        uint64 interval,
        uint64 endTime,
        uint8 maxFailures
    ) external nonReentrant returns (bytes32 scheduleId) {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();
        if (token == address(0)) revert ZeroAddress();
        if (interval < 3600) revert InvalidInterval(); // Min 1 hour
        if (endTime != 0 && endTime <= startTime) revert InvalidTimeRange();
        if (userSchedules[msg.sender].length >= maxSchedulesPerUser) {
            revert Unauthorized();
        }

        // Approve token transfer for the schedule
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        scheduleId = keccak256(
            abi.encodePacked(
                msg.sender,
                recipient,
                token,
                amount,
                startTime,
                block.timestamp
            )
        );

        schedules[scheduleId] = Schedule({
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            startTime: startTime,
            interval: interval,
            endTime: endTime,
            maxFailures: maxFailures,
            currentFailures: 0,
            status: ScheduleStatus.Active,
            lastExecution: 0,
            nextExecution: startTime
        });

        userSchedules[msg.sender].push(scheduleId);
        allScheduleIds.push(scheduleId);

        emit ScheduleCreated(
            scheduleId,
            msg.sender,
            recipient,
            token,
            amount,
            interval,
            startTime,
            endTime
        );
    }

    /// @notice Execute a due payment
    /// @param scheduleId The schedule to execute
    function executeDuePayment(bytes32 scheduleId) external nonReentrant scheduleExists(scheduleId) {
        Schedule storage schedule = schedules[scheduleId];

        if (schedule.status != ScheduleStatus.Active) revert ScheduleNotActive();
        if (block.timestamp < schedule.nextExecution) revert NotDue();
        if (schedule.endTime != 0 && block.timestamp > schedule.endTime) {
            schedule.status = ScheduleStatus.Expired;
            return;
        }

        // Check contract has enough tokens
        uint256 balance = IERC20(schedule.token).balanceOf(address(this));
        if (balance < schedule.amount) {
            schedule.currentFailures++;
            if (schedule.currentFailures >= schedule.maxFailures) {
                schedule.status = ScheduleStatus.Paused;
            }
            emit ExecutionFailed(scheduleId, "Insufficient balance");
            return;
        }

        // Execute transfer
        IERC20(schedule.token).safeTransfer(schedule.recipient, schedule.amount);

        // Update schedule state
        schedule.lastExecution = uint64(block.timestamp);
        schedule.currentFailures = 0;

        // Calculate next execution
        uint64 nextExec = uint64(block.timestamp + schedule.interval);
        if (schedule.endTime != 0 && nextExec > schedule.endTime) {
            schedule.status = ScheduleStatus.Expired;
            nextExec = 0;
        }
        schedule.nextExecution = nextExec;

        emit ExecutionSuccess(scheduleId, schedule.amount, nextExec);
    }

    /// @notice Execute multiple due payments in a single transaction
    /// @param scheduleIds Array of schedule IDs to execute
    function executeBatch(bytes32[] calldata scheduleIds) external nonReentrant {
        for (uint256 i = 0; i < scheduleIds.length; i++) {
            bytes32 id = scheduleIds[i];
            Schedule storage schedule = schedules[id];

            if (
                schedule.status == ScheduleStatus.Active &&
                block.timestamp >= schedule.nextExecution &&
                (schedule.endTime == 0 || block.timestamp <= schedule.endTime)
            ) {
                uint256 balance = IERC20(schedule.token).balanceOf(address(this));
                if (balance >= schedule.amount) {
                    IERC20(schedule.token).safeTransfer(schedule.recipient, schedule.amount);
                    schedule.lastExecution = uint64(block.timestamp);
                    schedule.currentFailures = 0;

                    uint64 nextExec = uint64(block.timestamp + schedule.interval);
                    if (schedule.endTime != 0 && nextExec > schedule.endTime) {
                        schedule.status = ScheduleStatus.Expired;
                        nextExec = 0;
                    }
                    schedule.nextExecution = nextExec;

                    emit ExecutionSuccess(id, schedule.amount, nextExec);
                } else {
                    schedule.currentFailures++;
                    if (schedule.currentFailures >= schedule.maxFailures) {
                        schedule.status = ScheduleStatus.Paused;
                    }
                    emit ExecutionFailed(id, "Insufficient balance");
                }
            }
        }
    }

    /// @notice Pause an active schedule
    /// @param scheduleId The schedule to pause
    function pauseSchedule(bytes32 scheduleId) external onlySender(scheduleId) scheduleExists(scheduleId) {
        if (schedules[scheduleId].status != ScheduleStatus.Active) revert ScheduleNotActive();
        schedules[scheduleId].status = ScheduleStatus.Paused;
        emit SchedulePaused(scheduleId);
    }

    /// @notice Resume a paused schedule
    /// @param scheduleId The schedule to resume
    function resumeSchedule(bytes32 scheduleId) external onlySender(scheduleId) scheduleExists(scheduleId) {
        if (schedules[scheduleId].status != ScheduleStatus.Paused) revert ScheduleNotActive();
        schedules[scheduleId].status = ScheduleStatus.Active;
        schedules[scheduleId].currentFailures = 0;
        schedules[scheduleId].nextExecution = uint64(block.timestamp + schedules[scheduleId].interval);
        emit ScheduleResumed(scheduleId);
    }

    /// @notice Cancel a schedule permanently
    /// @param scheduleId The schedule to cancel
    function cancelSchedule(bytes32 scheduleId) external onlySender(scheduleId) scheduleExists(scheduleId) {
        Schedule storage schedule = schedules[scheduleId];
        schedule.status = ScheduleStatus.Cancelled;

        // Refund remaining balance to sender
        uint256 balance = IERC20(schedule.token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(schedule.token).safeTransfer(schedule.sender, balance);
        }

        emit ScheduleCancelled(scheduleId);
    }

    // ─── View Functions ──────────────────────────────────────────────────

    /// @notice Get all active schedule IDs for a user
    /// @param user The user address
    /// @return Array of schedule IDs
    function getActiveSchedules(address user) external view returns (bytes32[] memory) {
        bytes32[] storage userScheds = userSchedules[user];
        uint256 activeCount = 0;

        for (uint256 i = 0; i < userScheds.length; i++) {
            if (schedules[userScheds[i]].status == ScheduleStatus.Active) {
                activeCount++;
            }
        }

        bytes32[] memory active = new bytes32[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < userScheds.length; i++) {
            if (schedules[userScheds[i]].status == ScheduleStatus.Active) {
                active[idx++] = userScheds[i];
            }
        }

        return active;
    }

    /// @notice Get schedules that are due for execution
    /// @param limit Maximum number of schedules to return
    /// @return Array of due schedule IDs
    function getDueSchedules(uint256 limit) external view returns (bytes32[] memory) {
        uint256 dueCount = 0;
        bytes32[] memory temp = new bytes32[](allScheduleIds.length < limit ? allScheduleIds.length : limit);

        for (uint256 i = 0; i < allScheduleIds.length && dueCount < limit; i++) {
            Schedule storage s = schedules[allScheduleIds[i]];
            if (
                s.status == ScheduleStatus.Active &&
                block.timestamp >= s.nextExecution &&
                (s.endTime == 0 || block.timestamp <= s.endTime)
            ) {
                temp[dueCount++] = allScheduleIds[i];
            }
        }

        bytes32[] memory due = new bytes32[](dueCount);
        for (uint256 i = 0; i < dueCount; i++) {
            due[i] = temp[i];
        }

        return due;
    }

    /// @notice Get full schedule details
    /// @param id The schedule ID
    /// @return The Schedule struct
    function getSchedule(bytes32 id) external view scheduleExists(id) returns (Schedule memory) {
        return schedules[id];
    }

    /// @notice Get total number of schedules
    function getTotalSchedules() external view returns (uint256) {
        return allScheduleIds.length;
    }
}
