import { Elysia } from 'elysia'
import { sql } from '../db/client'
import { redis } from '../lib/redis'

export const health = new Elysia()
  .get('/health', () => ({ status: 'ok' })) // liveness
  .get('/ready', async ({ set }) => {
    // readiness
    try {
      await Promise.all([sql`select 1`, redis.ping()])
      return { status: 'ready' }
    } catch {
      set.status = 503
      return { status: 'not_ready' as const }
    }
  })
