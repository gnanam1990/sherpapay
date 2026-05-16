import type { Pool } from 'pg'

export interface RecipientAlias {
  id: string
  user_id: string
  alias: string
  wallet_address: string
  created_at: Date
}

export function createAliasRepository(pool: Pool) {
  return {
    async findByAlias(userId: string, alias: string): Promise<RecipientAlias | null> {
      const { rows } = await pool.query<RecipientAlias>(
        'SELECT * FROM recipient_aliases WHERE user_id = $1 AND alias = $2',
        [userId, alias],
      )
      return rows[0]! ?? null
    },

    async findByAddress(userId: string, address: string): Promise<RecipientAlias | null> {
      const { rows } = await pool.query<RecipientAlias>(
        'SELECT * FROM recipient_aliases WHERE user_id = $1 AND wallet_address = $2',
        [userId, address],
      )
      return rows[0]! ?? null
    },

    async listByUser(userId: string): Promise<RecipientAlias[]> {
      const { rows } = await pool.query<RecipientAlias>(
        'SELECT * FROM recipient_aliases WHERE user_id = $1 ORDER BY alias',
        [userId],
      )
      return rows
    },

    async create(userId: string, alias: string, walletAddress: string): Promise<RecipientAlias> {
      const { rows } = await pool.query<RecipientAlias>(
        'INSERT INTO recipient_aliases (user_id, alias, wallet_address) VALUES ($1, $2, $3) RETURNING *',
        [userId, alias, walletAddress],
      )
      return rows[0]!
    },

    async update(id: string, walletAddress: string): Promise<RecipientAlias | null> {
      const { rows } = await pool.query<RecipientAlias>(
        'UPDATE recipient_aliases SET wallet_address = $2 WHERE id = $1 RETURNING *',
        [id, walletAddress],
      )
      return rows[0]! ?? null
    },

    async remove(id: string): Promise<boolean> {
      const { rowCount } = await pool.query('DELETE FROM recipient_aliases WHERE id = $1', [id])
      return (rowCount ?? 0) > 0
    },
  }
}
