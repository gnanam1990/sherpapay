import { describe, it, expect } from 'vitest'
import { encodeFunctionData, getAbiItem, type AbiFunction, type AbiEvent } from 'viem'
import { vaultAbi, VAULT_ADDRESS } from '../vault-abi.js'

describe('VAULT_ADDRESS', () => {
  it('is the deployed Celo mainnet vault address', () => {
    expect(VAULT_ADDRESS).toBe('0x70A58169BF96587E55F500c4b5cb9d956Ef826ee')
  })
})

describe('vaultAbi matches the deployed contract', () => {
  it('createGoal has the exact deployed signature (token, target, monthly, targetDate, label)', () => {
    const fn = getAbiItem({ abi: vaultAbi, name: 'createGoal' }) as AbiFunction
    expect(fn.inputs.map((i) => `${i.name}:${i.type}`)).toEqual([
      'token:address',
      'target:uint256',
      'monthly:uint256',
      'targetDate:uint64',
      'label:string',
    ])
    expect(fn.outputs).toEqual([{ name: 'goalId', type: 'bytes32' }])
  })

  it('exposes getGoal (not a public goals mapping)', () => {
    expect(getAbiItem({ abi: vaultAbi, name: 'getGoal' })).toBeDefined()
    expect(getAbiItem({ abi: vaultAbi, name: 'goals' })).toBeUndefined()
  })

  it('getGoal returns the 10-field Goal tuple', () => {
    const fn = getAbiItem({ abi: vaultAbi, name: 'getGoal' }) as AbiFunction
    const tuple = fn.outputs[0] as { components: { name: string }[] }
    expect(tuple.components.map((c) => c.name)).toEqual([
      'owner',
      'token',
      'targetAmount',
      'currentAmount',
      'monthlyContribution',
      'startTime',
      'targetDate',
      'label',
      'achieved',
      'emergencyWithdrawn',
    ])
  })

  it('contribute / withdraw / emergencyWithdraw take bytes32 goalId', () => {
    expect((getAbiItem({ abi: vaultAbi, name: 'withdraw' }) as AbiFunction).inputs).toEqual([
      { name: 'goalId', type: 'bytes32' },
    ])
    expect(
      (getAbiItem({ abi: vaultAbi, name: 'emergencyWithdraw' }) as AbiFunction).inputs,
    ).toEqual([{ name: 'goalId', type: 'bytes32' }])
  })

  it('GoalCreated event has 7 fields with id/owner indexed', () => {
    const ev = getAbiItem({ abi: vaultAbi, name: 'GoalCreated' }) as AbiEvent
    expect(ev.inputs).toHaveLength(7)
    expect(ev.inputs.filter((i) => 'indexed' in i && i.indexed).map((i) => i.name)).toEqual([
      'id',
      'owner',
    ])
  })

  it('is a valid ABI viem can encode calls against', () => {
    const data = encodeFunctionData({
      abi: vaultAbi,
      functionName: 'contribute',
      args: ['0x'.padEnd(66, 'b') as `0x${string}`, 1000n],
    })
    expect(data.startsWith('0x')).toBe(true)
  })
})
