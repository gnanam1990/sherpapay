import type { Pool } from 'pg'

export interface Goal {
  id: string
  onchain_id: string | null
  user_id: string
  token: string
  target_amount_wei: string
  current_amount_wei: string
  monthly_contribution_wei: string | null
  label: string
  target_date: Date | null
  achieved: boolean
  emergency_withdrawn: boolean
  created_at: Date
  updated_at: Date
}

export function createGoalRepository(pool: Pool) {
  return {
    async findById(id: string): Promise<Goal | null> {
      const { rows } = await pool.query<Goal>('SELECT * FROM goals WHERE id = $1', [id])
      return rows[0]! ?? null
    },

    async listByUser(userId: string): Promise<Goal[]> {
      const { rows } = await pool.query<Goal>(
        'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
        [userId],
      )
      return rows
    },

    async create(data: Omit<Goal, 'id' | 'created_at' | 'updated_at'>): Promise<Goal> {
      const { rows } = await pool.query<Goal>(
        `INSERT INTO goals (onchain_id, user_id, token, target_amount_wei, current_amount_wei, monthly_contribution_wei, label, target_date, achieved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [data.onchain_id, data.user_id, data.token, data.target_amount_wei, data.current_amount_wei, data.monthly_contribution_wei, data.label, data.target_date, data.achieved],
      )
      return rows[0]!
    },

    async contribute(id: string, amountWei: string): Promise<Goal | null> {
      const { rows } = await pool.query<Goal>(
        `UPDATE goals SET current_amount_wei = (current_amount_wei::numeric + $2::numeric)::text, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id, amountWei],
      )
      return rows[0]! ?? null
    },

    async markAchieved(id: string): Promise<Goal | null> {
      const { rows } = await pool.query<Goal>(
        'UPDATE goals SET achieved = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id],
      )
      return rows[0]! ?? null
    },

    async markWithdrawn(id: string, emergency: boolean): Promise<Goal | null> {
      const { rows } = await pool.query<Goal>(
        'UPDATE goals SET emergency_withdrawn = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id, emergency],
      )
      return rows[0]! ?? null
    },
  }
}
