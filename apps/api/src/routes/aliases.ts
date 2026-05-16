import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const CreateAliasSchema = z.object({
  userId: z.string().uuid(),
  alias: z.string().min(1).max(100),
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
})

export async function aliasRoutes(app: FastifyInstance) {
  app.post('/aliases', async (request, reply) => {
    const parsed = CreateAliasSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues })
    }

    return {
      id: 'placeholder-alias-id',
      ...parsed.data,
      createdAt: new Date().toISOString(),
    }
  })

  app.get('/aliases/:userId', async (request) => {
    const { userId } = request.params as { userId: string }
    return { aliases: [], userId }
  })

  app.delete('/aliases/:id', async (request) => {
    const { id } = request.params as { id: string }
    return { id, deleted: true }
  })
}
