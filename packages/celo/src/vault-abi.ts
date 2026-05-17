/**
 * ABI + address for the deployed SherpaPayVault contract.
 *
 * Transcribed verbatim from contracts/src/SherpaPayVault.sol — reflects
 * the ACTUAL deployed Celo mainnet contract.
 * Deployed: 0x70A58169BF96587E55F500c4b5cb9d956Ef826ee (Celo mainnet).
 * Mirrors CELO_MAINNET_SHERPAPAY_CONTRACTS.vault from @sherpapay/core.
 */
export const VAULT_ADDRESS = '0x70A58169BF96587E55F500c4b5cb9d956Ef826ee' as const

export const vaultAbi = [
  // ─── Write ─────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'createGoal',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'target', type: 'uint256' },
      { name: 'monthly', type: 'uint256' },
      { name: 'targetDate', type: 'uint64' },
      { name: 'label', type: 'string' },
    ],
    outputs: [{ name: 'goalId', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'contribute',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'goalId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'goalId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'emergencyWithdraw',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'goalId', type: 'bytes32' }],
    outputs: [],
  },
  // ─── Views ─────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'getGoal',
    stateMutability: 'view',
    inputs: [{ name: 'goalId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'targetAmount', type: 'uint256' },
          { name: 'currentAmount', type: 'uint256' },
          { name: 'monthlyContribution', type: 'uint256' },
          { name: 'startTime', type: 'uint64' },
          { name: 'targetDate', type: 'uint64' },
          { name: 'label', type: 'string' },
          { name: 'achieved', type: 'bool' },
          { name: 'emergencyWithdrawn', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getUserGoals',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    type: 'function',
    name: 'getProgress',
    stateMutability: 'view',
    inputs: [{ name: 'goalId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getTotalGoals',
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
    name: 'emergencyPenaltyBps',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ─── Events ────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'GoalCreated',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'targetAmount', type: 'uint256', indexed: false },
      { name: 'monthlyContribution', type: 'uint256', indexed: false },
      { name: 'targetDate', type: 'uint64', indexed: false },
      { name: 'label', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ContributionMade',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newTotal', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'GoalAchieved',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdrawal',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'EmergencyWithdrawal',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'penalty', type: 'uint256', indexed: false },
    ],
  },
] as const
