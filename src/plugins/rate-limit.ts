import { Elysia } from 'elysia'
import { redis } from '../lib/redis'

type Options = { name: string; limit: number; windowSec: number }

/** Fixed-window rate limit berbasis Redis. Pasang per grup route. */
export const rateLimit = ({ name, limit, windowSec }: Options) =>
  new Elysia({ name: `rate-limit:${name}` }).onBeforeHandle({ as: 'scoped' }, async ({ request, server, set }) => {
    // Percaya x-forwarded-for HANYA jika di belakang reverse proxy/LB milikmu
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      server?.requestIP(request)?.address ??
      'unknown'
    const bucket = Math.floor(Date.now() / (windowSec * 1000))
    const key = `rl:${name}:${ip}:${bucket}`
    try {
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, windowSec)
      set.headers['x-ratelimit-limit'] = String(limit)
      set.headers['x-ratelimit-remaining'] = String(Math.max(0, limit - count))
      if (count > limit) {
        set.status = 429
        set.headers['retry-after'] = String(windowSec)
        return { error: 'too_many_requests' as const }
      }
    } catch {
      // Redis bermasalah → fail-open agar app tidak ikut mati
    }
  })
