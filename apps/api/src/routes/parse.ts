import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { parse } from '@sherpapay/parser'
import { runSafetyChecks } from '@sherpapay/safety'
import type { SafetyContext } from '@sherpapay/core'

const ParseRequestSchema = z.object({
  input: z.string().min(1).max(500),
  userAddress: z.string().optional(),
  userBalance: z.string().optional(),
})

export async function parseRoutes(app: FastifyInstance) {
  app.post('/parse', async (request, reply) => {
    const parsed = ParseRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues })
    }

    const { input, userAddress, userBalance } = parsed.data
    const intent = parse(input)

    const context: SafetyContext = {
      userAddress: userAddress ?? '0x0000000000000000000000000000000000000000',
      userBalance: BigInt(userBalance ?? String(2n ** 256n - 1n)),
      dailySpent: BigInt(0),
      monthlySpent: BigInt(0),
      knownRecipients: [],
      averageAmount: BigInt(0),
    }

    const safety = runSafetyChecks(intent, context)

    return {
      intent,
      safety,
    }
  })
}
