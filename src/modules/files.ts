import { Elysia, t } from 'elysia'
import { db } from '../db/client'
import { files as filesTable } from '../db/schema'
import { presignDownload, presignUpload, s3 } from '../lib/storage'
import { rateLimit } from '../plugins/rate-limit'

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

export const files = new Elysia({ prefix: '/files' })
  .use(rateLimit({ name: 'upload', limit: 10, windowSec: 60 }))
  .post(
    '/presign',
    ({ body, set }) => {
      if (!ALLOWED.includes(body.contentType) || body.size > MAX_SIZE) {
        set.status = 422
        return { error: 'file_not_allowed' as const }
      }
      const safe = body.filename.replace(/[^\w.-]/g, '_').slice(0, 100)
      const key = `uploads/${crypto.randomUUID()}/${safe}`
      return { key, uploadUrl: presignUpload(key, body.contentType) }
    },
    {
      body: t.Object({
        filename: t.String({ minLength: 1 }),
        contentType: t.String(),
        size: t.Number({ minimum: 1 }),
      }),
    },
  )
  .post(
    '/confirm',
    async ({ body, set }) => {
      const stat = await s3.file(body.key).stat().catch(() => null)
      if (!stat || stat.size > MAX_SIZE) {
        set.status = 422
        return { error: 'upload_not_found_or_too_large' as const }
      }
      const [row] = await db
        .insert(filesTable)
        .values({ key: body.key, contentType: stat.type, size: stat.size })
        .returning()
      return { ...row, url: presignDownload(body.key) }
    },
    { body: t.Object({ key: t.String() }) },
  )
