import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import { env } from './config/env'
import { files } from './modules/files'
import { health } from './modules/health'
import { posts } from './modules/posts'
import { errorHandler } from './plugins/error'
import { rateLimit } from './plugins/rate-limit'
import { requestLogging } from './plugins/request-logging'

export const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGINS.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['content-type', 'authorization', 'x-request-id'],
      exposeHeaders: ['x-request-id', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'retry-after'],
      maxAge: 600,
    }),
  )
  .use(errorHandler)
  .use(requestLogging)
  .onAfterHandle({ as: 'global' }, ({ set }) => {
    set.headers['x-content-type-options'] = 'nosniff'
    set.headers['x-frame-options'] = 'DENY'
    set.headers['referrer-policy'] = 'strict-origin-when-cross-origin'
  })
  .use(env.ENABLE_DOCS ? openapi() : new Elysia())
  .use(health)
  .group('/api/v1', (api) =>
    api.use(rateLimit({ name: 'api', limit: 100, windowSec: 60 })).use(posts).use(files),
  )

export type App = typeof app
