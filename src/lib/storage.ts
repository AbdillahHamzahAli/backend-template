import { S3Client } from 'bun'
import { env } from '../config/env'

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  bucket: env.S3_BUCKET,
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
})

export const presignUpload = (key: string, type: string) =>
  s3.file(key).presign({ method: 'PUT', expiresIn: 300, type })

export const presignDownload = (key: string) => s3.file(key).presign({ expiresIn: 3600 })
