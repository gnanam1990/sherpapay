'use client'

import { useReadContract, useWriteContract } from 'wagmi'
import type { Address, Hex } from 'viem'
import { vaultAbi, VAULT_ADDRESS } from '@sherpapay/celo'
import type { WriteAction } from './scheduler-hooks'

export interface CreateGoalParams {
  token: Address
  /** Target amount, in wei. */
  target: bigint
  /** Suggested monthly contribution, in wei. */
  monthly: bigint
  /** Target completion date, unix seconds. */
  targetDate: bigint
  label: string
}

function bindVaultWrite<TArgs extends unknown[]>(
  send: (...args: TArgs) => Promise<Hex>,
  isPending: boolean,
  error: Error | null,
): WriteAction<TArgs> {
  const action = ((...args: TArgs) => send(...args)) as WriteAction<TArgs>
  action.isPending = isPending
  action.error = error
  return action
}

/** Wraps `createGoal`. */
export function useCreateGoal(): WriteAction<[CreateGoalParams]> {
  const { writeContractAsync, isPending, error } = useWriteContract()
  return bindVaultWrite(
    (params: CreateGoalParams) =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: 'createGoal',
        args: [params.token, params.target, params.monthly, params.targetDate, params.label],
      }),
    isPending,
    error,
  )
}

/** Wraps `contribute` — adds funds toward a goal. */
export function useContribute(): WriteAction<[Hex, bigint]> {
  const { writeContractAsync, isPending, error } = useWriteContract()
  return bindVaultWrite(
    (goalId: Hex, amount: bigint) =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: 'contribute',
        args: [goalId, amount],
      }),
    isPending,
    error,
  )
}

/**
 * Adds funds toward a goal. Spec-named alias of {@link useContribute} for the
 * natural-language goal flow — same on-chain `contribute` call.
 */
export const useGoalContribution = useContribute

/** Wraps `withdraw` — withdraw from an achieved goal. */
export function useWithdraw(): WriteAction<[Hex]> {
  const { writeContractAsync, isPending, error } = useWriteContract()
  return bindVaultWrite(
    (goalId: Hex) =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: 'withdraw',
        args: [goalId],
      }),
    isPending,
    error,
  )
}

/** Wraps `emergencyWithdraw` — early withdrawal with penalty. */
export function useEmergencyWithdraw(): WriteAction<[Hex]> {
  const { writeContractAsync, isPending, error } = useWriteContract()
  return bindVaultWrite(
    (goalId: Hex) =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: 'emergencyWithdraw',
        args: [goalId],
      }),
    isPending,
    error,
  )
}

/** Goal ids for a user (`getUserGoals`). */
export function useUserGoals(address: Address | undefined) {
  return useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: 'getUserGoals',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

/** Full Goal struct for a single id (`getGoal`). */
export function useGoal(goalId: Hex | undefined) {
  return useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: 'getGoal',
    args: goalId ? [goalId] : undefined,
    query: { enabled: !!goalId },
  })
}

/** Progress in basis points (10000 = 100%) for a goal (`getProgress`). */
export function useGoalProgress(goalId: Hex | undefined) {
  return useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: 'getProgress',
    args: goalId ? [goalId] : undefined,
    query: { enabled: !!goalId },
  })
}
