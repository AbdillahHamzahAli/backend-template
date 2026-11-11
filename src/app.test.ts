import { beforeAll, describe, expect, test } from 'bun:test'
import { app } from './app'
import { redis } from './lib/redis'
import { env } from './config/env'

const s3Up = await fetch(env.S3_ENDPOINT, { signal: AbortSignal.timeout(1500) }).then(
  () => true,
  () => false,
)

const call = (path: string, init?: RequestInit) => app.handle(new Request(`http://localhost${path}`, init))
const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

beforeAll(async () => {
  // bersihkan counter rate limit antar-run
  const keys = (await redis.send('KEYS', ['rl:*'])) as string[]
  if (keys.length) await redis.send('DEL', keys)
})

describe('health', () => {
  test('liveness', async () => {
    expect((await call('/health')).status).toBe(200)
  })
  test('readiness (butuh Postgres + Redis)', async () => {
    const res = await call('/ready')
    expect(res.status).toBe(200)
  })
})

describe('posts', () => {
  test('validasi body → 422', async () => {
    const res = await call('/api/v1/posts', json({ title: '' }))
    expect(res.status).toBe(422)
  })
  test('create lalu list (cache ter-invalidasi)', async () => {
    const before = await (await call('/api/v1/posts')).json()
    const created = await call('/api/v1/posts', json({ title: 'Halo dunia' }))
    expect(created.status).toBe(201)
    const after = (await (await call('/api/v1/posts')).json()) as { title: string }[]
    expect(after.length).toBe(before.length + 1)
    expect(after[0]?.title).toBe('Halo dunia')
  })
})

describe('files', () => {
  test('tipe file tidak diizinkan → 422', async () => {
    const res = await call('/api/v1/files/presign', json({ filename: 'a.exe', contentType: 'application/x-msdownload', size: 10 }))
    expect(res.status).toBe(422)
  })
  test('presign mengembalikan URL bertanda tangan', async () => {
    const res = await call('/api/v1/files/presign', json({ filename: 'a b.png', contentType: 'image/png', size: 10 }))
    const body = (await res.json()) as { key: string; uploadUrl: string }
    expect(res.status).toBe(200)
    expect(body.key).toMatch(/^uploads\/.+\/a_b\.png$/)
    expect(body.uploadUrl).toContain('X-Amz-Signature')
  })
})

describe('rate limit', () => {
  test('upload dibatasi 10/menit → 429', async () => {
    const base = json({ filename: 'x.png', contentType: 'image/png', size: 1 })
    const hit = () =>
    call('/api/v1/files/presign', { ...base, headers: { ...(base.headers as object), 'x-forwarded-for': '203.0.113.9' } })
    const statuses: number[] = []
    for (let i = 0; i < 14; i++) statuses.push((await hit()).status)
    expect(statuses).toContain(429)
  })
})

describe('docs & header', () => {
  test('openapi aktif saat ENABLE_DOCS=true', async () => {
    expect((await call('/openapi')).status).toBe(200)
  })
  test('x-request-id & security header ada', async () => {
    const res = await call('/health', { headers: { 'x-request-id': 'abc' } })
    expect(res.headers.get('x-request-id')).toBe('abc')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })
})

describe.skipIf(!s3Up)('storage end-to-end (presign → PUT → confirm)', () => {
  test('upload file lewat presigned URL lalu konfirmasi', async () => {
    const content = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]) // header PNG palsu
    const presign = await call('/api/v1/files/presign', json({ filename: 'tes.png', contentType: 'image/png', size: content.length }))
    const { key, uploadUrl } = (await presign.json()) as { key: string; uploadUrl: string }

    const put = await fetch(uploadUrl, { method: 'PUT', body: content, headers: { 'content-type': 'image/png' } })
    expect(put.ok).toBe(true)

    const confirm = await call('/api/v1/files/confirm', json({ key }))
    const body = (await confirm.json()) as { size: number; url: string }
    expect(confirm.status).toBe(200)
    expect(body.size).toBe(content.length)

    const download = await fetch(body.url) // presigned GET
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(content)
  })

  test('confirm untuk key yang tidak pernah di-upload → 422', async () => {
    const res = await call('/api/v1/files/confirm', json({ key: 'uploads/tidak-ada/x.png' }))
    expect(res.status).toBe(422)
  })
})
