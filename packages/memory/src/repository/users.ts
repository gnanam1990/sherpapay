import type { Pool } from 'pg'

export interface User {
  id: string
  wallet_address: string
  display_name: string | null
  preferred_language: string
  preferred_currency: string
  created_at: Date
  updated_at: Date
}

export function createUserRepository(pool: Pool) {
  return {
    async findByWalletAddress(walletAddress: string): Promise<User | null> {
      const { rows } = await pool.query<User>('SELECT * FROM users WHERE wallet_address = $1', [walletAddress])
      return rows[0] ?? null
    },

    async create(walletAddress: string, displayName?: string): Promise<User> {
      const { rows } = await pool.query<User>(
        'INSERT INTO users (wallet_address, display_name) VALUES ($1, $2) RETURNING *',
        [walletAddress, displayName ?? null],
      )
      return rows[0]!
    },

    async update(id: string, data: Partial<Pick<User, 'display_name' | 'preferred_language' | 'preferred_currency'>>): Promise<User | null> {
      const sets: string[] = []
      const values: unknown[] = []
      let idx = 1

      if (data.display_name !== undefined) {
        sets.push(`display_name = $${idx++}`)
        values.push(data.display_name)
      }
      if (data.preferred_language !== undefined) {
        sets.push(`preferred_language = $${idx++}`)
        values.push(data.preferred_language)
      }
      if (data.preferred_currency !== undefined) {
        sets.push(`preferred_currency = $${idx++}`)
        values.push(data.preferred_currency)
      }

      if (sets.length === 0) return null

      sets.push(`updated_at = NOW()`)
      values.push(id)

      const { rows } = await pool.query<User>(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        values,
      )
      return rows[0] ?? null
    },

    async findById(id: string): Promise<User | null> {
      const { rows } = await pool.query<User>('SELECT * FROM users WHERE id = $1', [id])
      return rows[0] ?? null
    },
  }
}
