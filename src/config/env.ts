import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  ENABLE_DOCS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
})

export const env = schema.parse(process.env)
