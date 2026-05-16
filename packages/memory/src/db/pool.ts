import pg from 'pg'

export interface DatabaseConfig {
  connectionString: string
  maxConnections?: number
}

export function createPool(config: DatabaseConfig): pg.Pool {
  return new pg.Pool({
    connectionString: config.connectionString,
    max: config.maxConnections ?? 10,
  })
}

export async function runMigrations(pool: pg.Pool, migrationsDir: string): Promise<void> {
  const { readdir, readFile } = await import('fs/promises')
  const { join } = await import('path')

  const files = (await readdir(migrationsDir)).sort()
  const client = await pool.connect()

  try {
    await client.query('CREATE TABLE IF NOT EXISTS migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())')

    for (const file of files) {
      if (!file.endsWith('.sql')) continue

      const { rows } = await client.query('SELECT name FROM migrations WHERE name = $1', [file])
      if (rows.length > 0) continue

      const sql = await readFile(join(migrationsDir, file), 'utf-8')
      await client.query(sql)
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file])
      console.log(`Applied migration: ${file}`)
    }
  } finally {
    client.release()
  }
}
