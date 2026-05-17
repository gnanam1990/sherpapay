'use client'

import { useReadContract, useWriteContract } from 'wagmi'
import type { Address, Hex } from 'viem'
import { schedulerAbi, SCHEDULER_ADDRESS } from './scheduler-abi.js'

export interface CreateScheduleParams {
  recipient: Address
  token: Address
  /** Per-execution amount, in wei. */
  amount: bigint
  /** First execution, unix seconds. */
  startTime: bigint
  /** Seconds between executions (contract enforces >= 3600). */
  interval: bigint
  /** Last allowed execution, unix seconds. 0n = perpetual. */
  endTime: bigint
  /** Auto-pause after this many consecutive failures. */
  maxFailures: number
}

/**
 * A thin, declaration-portable wrapper around a single contract write.
 * We expose only primitive-typed fields so package `.d.ts` emit does not
 * reference unnameable deep @wagmi/core types (TS2742).
 */
export interface WriteAction<TArgs extends unknown[]> {
  (...args: TArgs): Promise<Hex>
  /** Tx in flight. */
  isPending: boolean
  /** Last error, if any. */
  error: Error | null
}

function bindWrite<TArgs extends unknown[]>(
  send: (...args: TArgs) => Promise<Hex>,
  isPending: boolean,
  error: Error | null,
): WriteAction<TArgs> {
  const action = ((...args: TArgs) => send(...args)) as WriteAction<TArgs>
  action.isPending = isPending
  action.error = error
  return action
}

/**
 * Wraps `schedulePayment`. The contract pulls one `amount` of escrow on
 * creation; fund the remaining cycles with {@link useFundSchedule}.
 */
export function useCreateSchedule(): WriteAction<[CreateScheduleParams]> {
  const { writeContractAsync, isPending, error } = useWriteContract()
  return bindWrite(
    (params: CreateScheduleParams) =>
      writeContractAsync({
        address: SCHEDULER_ADDRESS,
        abi: schedulerAbi,
        functionName: 'schedulePayment',
        args: [
          params.recipient,
          params.token,
          params.amount,
          params.startTime,
          params.interval,
          params.endTime,
          params.maxFailures,
        ],
      }),
    isPending,
    error,
  )
}

/** Wraps `fundSchedule` — adds escrow for future executions. */
export function useFundSchedule(): WriteAction<[Hex, bigint]> {
  const { writeContractAsync, isPending, error } = useWriteContract()
  return bindWrite(
    (scheduleId: Hex, amount: bigint) =>
      writeContractAsync({
        address: SCHEDULER_ADDRESS,
        abi: schedulerAbi,
        functionName: 'fundSchedule',
        args: [scheduleId, amount],
      }),
    isPending,
    error,
  )
}

function useScheduleAction(
  functionName: 'pauseSchedule' | 'resumeSchedule' | 'cancelSchedule',
): WriteAction<[Hex]> {
  const { writeContractAsync, isPending, error } = useWriteContract()
  return bindWrite(
    (scheduleId: Hex) =>
      writeContractAsync({
        address: SCHEDULER_ADDRESS,
        abi: schedulerAbi,
        functionName,
        args: [scheduleId],
      }),
    isPending,
    error,
  )
}

export function usePauseSchedule(): WriteAction<[Hex]> {
  return useScheduleAction('pauseSchedule')
}

export function useResumeSchedule(): WriteAction<[Hex]> {
  return useScheduleAction('resumeSchedule')
}

export function useCancelSchedule(): WriteAction<[Hex]> {
  return useScheduleAction('cancelSchedule')
}

/** Active schedule ids for a user (`getActiveSchedules`). */
export function useUserSchedules(address: Address | undefined) {
  return useReadContract({
    address: SCHEDULER_ADDRESS,
    abi: schedulerAbi,
    functionName: 'getActiveSchedules',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

/** Full Schedule struct for a single id (`getSchedule`). */
export function useSchedule(scheduleId: Hex | undefined) {
  return useReadContract({
    address: SCHEDULER_ADDRESS,
    abi: schedulerAbi,
    functionName: 'getSchedule',
    args: scheduleId ? [scheduleId] : undefined,
    query: { enabled: !!scheduleId },
  })
}
