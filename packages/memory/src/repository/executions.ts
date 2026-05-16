import type { Pool } from 'pg'

export interface Execution {
  id: string
  schedule_id: string
  tx_hash: string | null
  amount_wei: string
  status: string
  error_message: string | null
  gas_used: string | null
  executed_at: Date
}

export function createExecutionRepository(pool: Pool) {
  return {
    async create(data: Omit<Execution, 'id' | 'executed_at'>): Promise<Execution> {
      const { rows } = await pool.query<Execution>(
        'INSERT INTO executions (schedule_id, tx_hash, amount_wei, status, error_message, gas_used) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [data.schedule_id, data.tx_hash, data.amount_wei, data.status, data.error_message, data.gas_used],
      )
      return rows[0]!
    },

    async listBySchedule(scheduleId: string, limit: number = 50): Promise<Execution[]> {
      const { rows } = await pool.query<Execution>(
        'SELECT * FROM executions WHERE schedule_id = $1 ORDER BY executed_at DESC LIMIT $2',
        [scheduleId, limit],
      )
      return rows
    },

    async listByUser(userId: string, limit: number = 100): Promise<Execution[]> {
      const { rows } = await pool.query<Execution>(
        `SELECT e.* FROM executions e
         JOIN schedules s ON e.schedule_id = s.id
         WHERE s.user_id = $1
         ORDER BY e.executed_at DESC
         LIMIT $2`,
        [userId, limit],
      )
      return rows
    },
  }
}
