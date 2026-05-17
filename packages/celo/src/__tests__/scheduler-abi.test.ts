import { describe, it, expect } from 'vitest'
import { encodeFunctionData, getAbiItem, type AbiFunction, type AbiEvent } from 'viem'
import { schedulerAbi, SCHEDULER_ADDRESS } from '../scheduler-abi.js'

describe('SCHEDULER_ADDRESS', () => {
  it('is the deployed Celo mainnet scheduler address', () => {
    expect(SCHEDULER_ADDRESS).toBe('0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933')
  })
})

describe('schedulerAbi matches the deployed contract', () => {
  it('schedulePayment has the exact deployed signature (recipient, token, amount, startTime, interval, endTime, maxFailures)', () => {
    const fn = getAbiItem({ abi: schedulerAbi, name: 'schedulePayment' }) as AbiFunction
    expect(fn.inputs.map((i) => `${i.name}:${i.type}`)).toEqual([
      'recipient:address',
      'token:address',
      'amount:uint256',
      'startTime:uint64',
      'interval:uint64',
      'endTime:uint64',
      'maxFailures:uint8',
    ])
    expect(fn.outputs).toEqual([{ name: 'scheduleId', type: 'bytes32' }])
  })

  it('does NOT expose a (non-existent) createSchedule function', () => {
    expect(getAbiItem({ abi: schedulerAbi, name: 'createSchedule' })).toBeUndefined()
  })

  it('executeDuePayment / executeBatch take bytes32 (not uint256) ids', () => {
    const due = getAbiItem({ abi: schedulerAbi, name: 'executeDuePayment' }) as AbiFunction
    const batch = getAbiItem({ abi: schedulerAbi, name: 'executeBatch' }) as AbiFunction
    expect(due.inputs).toEqual([{ name: 'scheduleId', type: 'bytes32' }])
    expect(batch.inputs).toEqual([{ name: 'scheduleIds', type: 'bytes32[]' }])
  })

  it('getSchedule returns the 13-field Schedule tuple', () => {
    const fn = getAbiItem({ abi: schedulerAbi, name: 'getSchedule' }) as AbiFunction
    const tuple = fn.outputs[0] as { components: { name: string }[] }
    expect(tuple.components.map((c) => c.name)).toEqual([
      'sender',
      'recipient',
      'token',
      'amount',
      'remainingBalance',
      'startTime',
      'interval',
      'endTime',
      'maxFailures',
      'currentFailures',
      'status',
      'lastExecution',
      'nextExecution',
    ])
  })

  it('ScheduleCreated event has 8 fields with id/sender/recipient indexed', () => {
    const ev = getAbiItem({ abi: schedulerAbi, name: 'ScheduleCreated' }) as AbiEvent
    expect(ev.inputs).toHaveLength(8)
    expect(ev.inputs.filter((i) => 'indexed' in i && i.indexed).map((i) => i.name)).toEqual([
      'id',
      'sender',
      'recipient',
    ])
  })

  it('is a valid ABI viem can encode calls against (bytes32 scheduleId)', () => {
    const data = encodeFunctionData({
      abi: schedulerAbi,
      functionName: 'executeDuePayment',
      args: ['0x'.padEnd(66, 'a') as `0x${string}`],
    })
    expect(data.startsWith('0x')).toBe(true)
  })
})
