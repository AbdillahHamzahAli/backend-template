import { app } from './app'
import { env } from './config/env'
import { sql } from './db/client'
import { redis } from './lib/redis'

app.listen({ port: env.PORT, hostname: '0.0.0.0' })
console.log(JSON.stringify({ level: 'info', msg: `API listening on :${env.PORT}` }))

// Graceful shutdown (penting untuk rolling deploy)
const shutdown = async () => {
  await app.stop()
  redis.close()
  await sql.close()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
