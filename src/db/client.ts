import { SQL } from 'bun'
import { drizzle } from 'drizzle-orm/bun-sql'
import { env } from '../config/env'
import * as schema from './schema'

export const sql = new SQL({ url: env.DATABASE_URL, max: 20, idleTimeout: 30 })
export const db = drizzle({ client: sql, schema })
