import { RedisClient } from 'bun'
import { env } from '../config/env'

export const redis = new RedisClient(env.REDIS_URL)
