export interface DatabaseConfig {
  readonly connectionString: string
  readonly maxConnections: number
}

export function createDatabasePool(_config: DatabaseConfig): null {
  // Placeholder — implemented in Stage 4
  return null
}
