import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const CreateGoalSchema = z.object({
  userId: z.string().uuid(),
  token: z.enum(['cUSD', 'cEUR', 'USDT']),
  targetAmountWei: z.string(),
  monthlyContributionWei: z.string().optional(),
  label: z.string().min(1).max(200),
  targetDate: z.string().datetime().optional(),
})

export async function goalRoutes(app: FastifyInstance) {
  app.post('/goals', async (request, reply) => {
    const parsed = CreateGoalSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues })
    }

    return {
      id: 'placeholder-goal-id',
      ...parsed.data,
      currentAmountWei: '0',
      achieved: false,
      createdAt: new Date().toISOString(),
    }
  })

  app.get('/goals/:userId', async (request) => {
    const { userId } = request.params as { userId: string }
    return { goals: [], userId }
  })

  app.post('/goals/:id/contribute', async (request) => {
    const { id } = request.params as { id: string }
    const { amountWei } = request.body as { amountWei: string }
    return { id, contributed: amountWei }
  })
}
