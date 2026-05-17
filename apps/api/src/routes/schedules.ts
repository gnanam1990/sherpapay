import type { FastifyInstance, FastifyReply } from 'fastify'
import type { createScheduleRepository } from '@sherpapay/memory'
import { z } from 'zod'

type ScheduleRepository = ReturnType<typeof createScheduleRepository>

export interface ScheduleRoutesOptions {
  scheduleRepo: ScheduleRepository | null
}

const CreateScheduleSchema = z.object({
  userId: z.string().uuid(),
  recipientAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  token: z.enum(['cUSD', 'cEUR', 'USDT']),
  amountWei: z.string(),
  frequencyKind: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  frequencyValue: z.number().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  maxFailures: z.number().int().min(1).max(255).optional(),
  alias: z.string().optional(),
})

// bytes32 schedule id emitted by SherpaPayScheduler.ScheduleCreated.
const OnchainSchema = z.object({
  onchainId: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  txHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .optional(),
})

export async function scheduleRoutes(app: FastifyInstance, opts: ScheduleRoutesOptions) {
  const repo = opts.scheduleRepo

  function requireRepo(reply: FastifyReply): ScheduleRepository | null {
    if (!repo) {
      void reply.status(503).send({ error: 'database_unavailable' })
      return null
    }
    return repo
  }

  app.post('/schedules', async (request, reply) => {
    const db = requireRepo(reply)
    if (!db) return

    const parsed = CreateScheduleSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues })
    }

    const d = parsed.data
    const startTime = new Date(d.startTime)
    // Persisted before the on-chain tx confirms; onchain_id is filled in
    // later via PATCH /:id/onchain once SherpaPayScheduler emits the id.
    // Note: frequency_kind/value mirror the parsed NL intent, while the
    // contract row tracks interval/endTime — they describe the same
    // schedule from two angles and may render differently.
    const schedule = await db.create({
      onchain_id: null,
      onchain_tx_hash: null,
      onchain_status: null,
      user_id: d.userId,
      recipient_address: d.recipientAddress,
      token: d.token,
      amount_wei: d.amountWei,
      frequency_kind: d.frequencyKind,
      frequency_value: d.frequencyValue ?? null,
      start_time: startTime,
      end_time: d.endTime ? new Date(d.endTime) : null,
      max_failures: d.maxFailures ?? 3,
      current_failures: 0,
      status: 'pending',
      alias: d.alias ?? null,
      last_execution: null,
      next_execution: startTime,
    })

    return reply.status(201).send({ schedule })
  })

  app.patch('/schedules/:id/onchain', async (request, reply) => {
    const db = requireRepo(reply)
    if (!db) return

    const { id } = request.params as { id: string }
    const parsed = OnchainSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_onchain_id' })
    }

    const updated = await db.setOnchain(id, parsed.data.onchainId, parsed.data.txHash ?? null)
    if (!updated) {
      return reply.status(404).send({ error: 'schedule_not_found' })
    }
    return reply.send({ schedule: updated })
  })

  app.get('/schedules/:userId', async (request, reply) => {
    const db = requireRepo(reply)
    if (!db) return
    const { userId } = request.params as { userId: string }
    const schedules = await db.listByUser(userId)
    return reply.send({ schedules, userId })
  })

  app.delete('/schedules/:id', async (request, reply) => {
    const db = requireRepo(reply)
    if (!db) return
    const { id } = request.params as { id: string }
    const updated = await db.updateStatus(id, 'cancelled')
    if (!updated) {
      return reply.status(404).send({ error: 'schedule_not_found' })
    }
    return reply.send({ schedule: updated })
  })
}
