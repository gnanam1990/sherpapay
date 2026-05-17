import { describe, it, expect, vi } from 'vitest'
import { executeBatch, type BatchSendOps } from '../batch-send'

function ops(over: Partial<BatchSendOps> = {}): BatchSendOps {
  return {
    submit: (r: string) => Promise.resolve(`0xhash_${r}`),
    confirm: () => Promise.resolve(),
    ...over,
  }
}

describe('executeBatch', () => {
  it('confirms every recipient on the happy path', async () => {
    const s = await executeBatch(['a', 'b', 'c'], ops())
    expect(s.succeeded).toBe(3)
    expect(s.failed).toBe(0)
    expect(s.items.map((i) => i.status)).toEqual(['confirmed', 'confirmed', 'confirmed'])
    expect(s.items[0]?.hash).toBe('0xhash_a')
  })

  it('continues after a mid-batch submit failure', async () => {
    const s = await executeBatch(
      ['a', 'b', 'c'],
      ops({
        submit: (r) => (r === 'b' ? Promise.reject(new Error('nope')) : Promise.resolve(`0x_${r}`)),
      }),
    )
    expect(s.succeeded).toBe(2)
    expect(s.failed).toBe(1)
    expect(s.items[1]).toMatchObject({ recipient: 'b', status: 'failed', error: 'nope' })
    expect(s.items[2]?.status).toBe('confirmed')
  })

  it('marks failed when confirmation rejects (hash still recorded)', async () => {
    const s = await executeBatch(
      ['a', 'b'],
      ops({
        confirm: (h) =>
          h === '0xhash_a' ? Promise.reject(new Error('reverted')) : Promise.resolve(),
      }),
    )
    expect(s.items[0]).toMatchObject({ status: 'failed', error: 'reverted', hash: '0xhash_a' })
    expect(s.items[1]?.status).toBe('confirmed')
    expect(s.succeeded).toBe(1)
    expect(s.failed).toBe(1)
  })

  it('runs strictly sequentially (n+1 starts only after n settles)', async () => {
    const calls: string[] = []
    const mk = (tag: string) => (r: string) => {
      calls.push(`${tag}:${r}`)
      return Promise.resolve(tag === 'submit' ? `0x_${r}` : undefined) as Promise<never>
    }
    await executeBatch(['a', 'b'], { submit: mk('submit'), confirm: mk('confirm') })
    // confirm receives the tx hash, not the recipient
    expect(calls).toEqual(['submit:a', 'confirm:0x_a', 'submit:b', 'confirm:0x_b'])
  })

  it('streams progressive updates via onUpdate', async () => {
    const snapshots: string[][] = []
    await executeBatch(
      ['a', 'b'],
      ops({ onUpdate: (items) => snapshots.push(items.map((i) => i.status)) }),
    )
    // first recipient reaches submitted before second leaves pending
    expect(snapshots).toContainEqual(['submitted', 'pending'])
    expect(snapshots.at(-1)).toEqual(['confirmed', 'confirmed'])
  })

  it('handles an all-fail batch', async () => {
    const s = await executeBatch(['a', 'b'], ops({ submit: () => Promise.reject(new Error('x')) }))
    expect(s.succeeded).toBe(0)
    expect(s.failed).toBe(2)
  })

  it('handles a single recipient', async () => {
    const s = await executeBatch(['solo'], ops())
    expect(s.items).toHaveLength(1)
    expect(s.succeeded).toBe(1)
  })

  it('returns an empty summary for no recipients', async () => {
    const s = await executeBatch([], ops())
    expect(s).toEqual({ items: [], succeeded: 0, failed: 0 })
  })

  it('uses a generic message when the error is not an Error', async () => {
    const s = await executeBatch(['a'], ops({ submit: () => Promise.reject('weird') }))
    expect(s.items[0]?.status).toBe('failed')
    expect(typeof s.items[0]?.error).toBe('string')
    expect(s.items[0]?.error?.length).toBeGreaterThan(0)
  })

  it('onUpdate sees a failed transition too', async () => {
    const seen = vi.fn()
    await executeBatch(['a'], ops({ submit: () => Promise.reject(new Error('e')), onUpdate: seen }))
    const calls = seen.mock.calls.map((c) => (c[0] as { status: string }[])[0]?.status)
    expect(calls).toContain('failed')
  })
})
