import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const CreateScheduleSchema = z.object({
  userId: z.string().uuid(),
  recipientAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  token: z.enum(['cUSD', 'cEUR', 'USDT']),
  amountWei: z.string(),
  frequencyKind: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  frequencyValue: z.number().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  alias: z.string().optional(),
})

export async function scheduleRoutes(app: FastifyInstance) {
  app.post('/schedules', async (request, reply) => {
    const parsed = CreateScheduleSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues })
    }

    return {
      id: 'placeholder-schedule-id',
      ...parsed.data,
      status: 'active',
      currentFailures: 0,
      maxFailures: 3,
      createdAt: new Date().toISOString(),
    }
  })

  app.get('/schedules/:userId', async (request) => {
    const { userId } = request.params as { userId: string }
    return { schedules: [], userId }
  })

  app.delete('/schedules/:id', async (request) => {
    const { id } = request.params as { id: string }
    return { id, status: 'cancelled' }
  })
}
