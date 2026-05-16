import type { Pool } from 'pg'

export interface Schedule {
  id: string
  onchain_id: string | null
  user_id: string
  recipient_address: string
  token: string
  amount_wei: string
  frequency_kind: string
  frequency_value: number | null
  start_time: Date
  end_time: Date | null
  max_failures: number
  current_failures: number
  status: string
  alias: string | null
  last_execution: Date | null
  next_execution: Date | null
  created_at: Date
  updated_at: Date
}

export function createScheduleRepository(pool: Pool) {
  return {
    async findById(id: string): Promise<Schedule | null> {
      const { rows } = await pool.query<Schedule>('SELECT * FROM schedules WHERE id = $1', [id])
      return rows[0]! ?? null
    },

    async findByOnchainId(onchainId: string): Promise<Schedule | null> {
      const { rows } = await pool.query<Schedule>('SELECT * FROM schedules WHERE onchain_id = $1', [onchainId])
      return rows[0]! ?? null
    },

    async listByUser(userId: string, status?: string): Promise<Schedule[]> {
      if (status) {
        const { rows } = await pool.query<Schedule>(
          'SELECT * FROM schedules WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
          [userId, status],
        )
        return rows
      }
      const { rows } = await pool.query<Schedule>(
        'SELECT * FROM schedules WHERE user_id = $1 ORDER BY created_at DESC',
        [userId],
      )
      return rows
    },

    async listDue(limit: number = 50): Promise<Schedule[]> {
      const { rows } = await pool.query<Schedule>(
        "SELECT * FROM schedules WHERE status = 'active' AND next_execution <= NOW() ORDER BY next_execution LIMIT $1",
        [limit],
      )
      return rows
    },

    async create(data: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>): Promise<Schedule> {
      const { rows } = await pool.query<Schedule>(
        `INSERT INTO schedules (onchain_id, user_id, recipient_address, token, amount_wei, frequency_kind, frequency_value, start_time, end_time, max_failures, status, alias, next_execution)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [data.onchain_id, data.user_id, data.recipient_address, data.token, data.amount_wei, data.frequency_kind, data.frequency_value, data.start_time, data.end_time, data.max_failures, data.status, data.alias, data.next_execution],
      )
      return rows[0]!
    },

    async updateStatus(id: string, status: string): Promise<Schedule | null> {
      const { rows } = await pool.query<Schedule>(
        'UPDATE schedules SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id, status],
      )
      return rows[0]! ?? null
    },

    async recordExecution(id: string, success: boolean, _errorMessage?: string): Promise<void> {
      if (success) {
        await pool.query(
          "UPDATE schedules SET last_execution = NOW(), current_failures = 0, updated_at = NOW() WHERE id = $1",
          [id],
        )
      } else {
        await pool.query(
          "UPDATE schedules SET current_failures = current_failures + 1, updated_at = NOW() WHERE id = $1",
          [id],
        )
      }
    },
  }
}
