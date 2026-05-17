/**
 * ABI + address for the deployed SherpaPayScheduler contract.
 *
 * This ABI is transcribed from contracts/src/SherpaPayScheduler.sol and
 * reflects the ACTUAL deployed Celo mainnet contract — not a guess.
 * Deployed: 0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933 (Celo mainnet, 42220).
 *
 * Mirrors CELO_MAINNET_SHERPAPAY_CONTRACTS.scheduler from @sherpapay/core,
 * re-declared here as a literal so viem infers the `0x${string}` type.
 */
export const SCHEDULER_ADDRESS = '0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933' as const

/**
 * Number of cycles a schedule is created for in the MVP. The contract has
 * no maxExecutions concept; a finite schedule is enforced via `endTime`
 * (= startTime + interval * cycles) and prefunded escrow (amount * cycles).
 *
 * Hardcoded for the MVP submission. Configurable later (intended range
 * 1–100) by threading a user-chosen value through these helpers instead
 * of the constant.
 */
export const DEFAULT_SCHEDULE_CYCLES = 12

/** endTime that caps a schedule at `cycles` executions from `startTime`. */
export function scheduleEndTime(
  startTime: bigint,
  interval: bigint,
  cycles: number = DEFAULT_SCHEDULE_CYCLES,
): bigint {
  return startTime + interval * BigInt(cycles)
}

/** Total escrow to lock for `cycles` executions of `amount`. */
export function scheduleEscrowTotal(
  amount: bigint,
  cycles: number = DEFAULT_SCHEDULE_CYCLES,
): bigint {
  return amount * BigInt(cycles)
}

export const schedulerAbi = [
  // ─── Write ─────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'schedulePayment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'startTime', type: 'uint64' },
      { name: 'interval', type: 'uint64' },
      { name: 'endTime', type: 'uint64' },
      { name: 'maxFailures', type: 'uint8' },
    ],
    outputs: [{ name: 'scheduleId', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'fundSchedule',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'scheduleId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'executeDuePayment',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'scheduleId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'executeBatch',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'scheduleIds', type: 'bytes32[]' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pauseSchedule',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'scheduleId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'resumeSchedule',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'scheduleId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelSchedule',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'scheduleId', type: 'bytes32' }],
    outputs: [],
  },
  // ─── Views ─────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'getActiveSchedules',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    type: 'function',
    name: 'getDueSchedules',
    stateMutability: 'view',
    inputs: [{ name: 'limit', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    type: 'function',
    name: 'getSchedule',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'remainingBalance', type: 'uint256' },
          { name: 'startTime', type: 'uint64' },
          { name: 'interval', type: 'uint64' },
          { name: 'endTime', type: 'uint64' },
          { name: 'maxFailures', type: 'uint8' },
          { name: 'currentFailures', type: 'uint8' },
          { name: 'status', type: 'uint8' },
          { name: 'lastExecution', type: 'uint64' },
          { name: 'nextExecution', type: 'uint64' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getTotalSchedules',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'maxSchedulesPerUser',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ─── Events ────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'ScheduleCreated',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'interval', type: 'uint64', indexed: false },
      { name: 'startTime', type: 'uint64', indexed: false },
      { name: 'endTime', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ExecutionSuccess',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'nextExecution', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ExecutionFailed',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ScheduleFunded',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newBalance', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ScheduleCancelled',
    inputs: [{ name: 'id', type: 'bytes32', indexed: true }],
  },
  {
    type: 'event',
    name: 'SchedulePaused',
    inputs: [{ name: 'id', type: 'bytes32', indexed: true }],
  },
  {
    type: 'event',
    name: 'ScheduleResumed',
    inputs: [{ name: 'id', type: 'bytes32', indexed: true }],
  },
] as const
