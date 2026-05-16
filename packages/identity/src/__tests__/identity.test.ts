import { describe, it, expect } from 'vitest'
import { createMemoryAliasStore } from '../index.js'

describe('createMemoryAliasStore', () => {
  it('adds and resolves alias', () => {
    const store = createMemoryAliasStore()
    store.addAlias('mom', '0x1234', 'user1')
    expect(store.resolveAlias('mom', 'user1')).toBe('0x1234')
  })

  it('returns null for unknown alias', () => {
    const store = createMemoryAliasStore()
    expect(store.resolveAlias('unknown', 'user1')).toBeNull()
  })

  it('returns null for wrong user', () => {
    const store = createMemoryAliasStore()
    store.addAlias('mom', '0x1234', 'user1')
    expect(store.resolveAlias('mom', 'user2')).toBeNull()
  })

  it('lists aliases for user', () => {
    const store = createMemoryAliasStore()
    store.addAlias('mom', '0x1234', 'user1')
    store.addAlias('dad', '0x5678', 'user1')
    const aliases = store.listAliases('user1')
    expect(aliases).toHaveLength(2)
    expect(aliases).toContainEqual({ alias: 'mom', address: '0x1234' })
    expect(aliases).toContainEqual({ alias: 'dad', address: '0x5678' })
  })

  it('returns empty list for unknown user', () => {
    const store = createMemoryAliasStore()
    expect(store.listAliases('unknown')).toEqual([])
  })

  it('removes alias', () => {
    const store = createMemoryAliasStore()
    store.addAlias('mom', '0x1234', 'user1')
    expect(store.removeAlias('mom', 'user1')).toBe(true)
    expect(store.resolveAlias('mom', 'user1')).toBeNull()
  })

  it('returns false when removing non-existent alias', () => {
    const store = createMemoryAliasStore()
    expect(store.removeAlias('unknown', 'user1')).toBe(false)
  })

  it('overwrites existing alias', () => {
    const store = createMemoryAliasStore()
    store.addAlias('mom', '0x1234', 'user1')
    store.addAlias('mom', '0x5678', 'user1')
    expect(store.resolveAlias('mom', 'user1')).toBe('0x5678')
  })

  it('isolates users', () => {
    const store = createMemoryAliasStore()
    store.addAlias('mom', '0x1234', 'user1')
    store.addAlias('mom', '0x5678', 'user2')
    expect(store.resolveAlias('mom', 'user1')).toBe('0x1234')
    expect(store.resolveAlias('mom', 'user2')).toBe('0x5678')
  })
})
