export interface AliasStore {
  resolveAlias(alias: string, userId: string): string | null
  addAlias(alias: string, address: string, userId: string): void
  listAliases(userId: string): Array<{ alias: string; address: string }>
  removeAlias(alias: string, userId: string): boolean
}

export function createMemoryAliasStore(): AliasStore {
  const store = new Map<string, Map<string, string>>()

  return {
    resolveAlias(alias: string, userId: string): string | null {
      const userAliases = store.get(userId)
      return userAliases?.get(alias) ?? null
    },

    addAlias(alias: string, address: string, userId: string): void {
      if (!store.has(userId)) {
        store.set(userId, new Map())
      }
      store.get(userId)!.set(alias, address)
    },

    listAliases(userId: string): Array<{ alias: string; address: string }> {
      const userAliases = store.get(userId)
      if (!userAliases) return []
      return Array.from(userAliases.entries()).map(([alias, address]) => ({
        alias,
        address,
      }))
    },

    removeAlias(alias: string, userId: string): boolean {
      const userAliases = store.get(userId)
      if (!userAliases) return false
      return userAliases.delete(alias)
    },
  }
}
