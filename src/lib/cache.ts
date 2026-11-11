import { redis } from './redis'

/** Cache-aside. Jika Redis bermasalah, app tetap jalan (fail-open). */
export async function cached<T>(key: string, ttlSec: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key)
    if (hit) return JSON.parse(hit) as T
  } catch {}
  const data = await load()
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSec)
  } catch {}
  return data
}

/** Invalidasi massal tanpa SCAN: naikkan "versi" namespace. */
export const nsVersion = async (ns: string) => (await redis.get(`ver:${ns}`).catch(() => null)) ?? '0'
export const bumpNs = (ns: string) => redis.incr(`ver:${ns}`).catch(() => {})
