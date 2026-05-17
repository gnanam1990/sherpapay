import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { createPool, createScheduleRepository } from '@sherpapay/memory'
import { parseRoutes } from './routes/parse.js'
import { scheduleRoutes } from './routes/schedules.js'
import { aliasRoutes } from './routes/aliases.js'
import { goalRoutes } from './routes/goals.js'
import { healthRoutes } from './routes/health.js'

export async function buildApp() {
  const app = Fastify({
    logger: true,
  })

  await app.register(cors, {
    origin: ['http://localhost:3000', 'https://sherpapay.xyz', 'https://sherpapay.vercel.app'],
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // pg.Pool is lazy — no connection is opened until a query runs, so the
  // API still boots (health/parse) without a database. Schedule routes
  // return 503 when DATABASE_URL is unset.
  const databaseUrl = process.env.DATABASE_URL
  const scheduleRepo = databaseUrl
    ? createScheduleRepository(createPool({ connectionString: databaseUrl }))
    : null

  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(parseRoutes, { prefix: '/api' })
  await app.register(scheduleRoutes, { prefix: '/api', scheduleRepo })
  await app.register(aliasRoutes, { prefix: '/api' })
  await app.register(goalRoutes, { prefix: '/api' })

  return app
}
