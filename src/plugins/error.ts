import { Elysia } from 'elysia'

export const errorHandler = new Elysia({ name: 'error-handler' }).onError({ as: 'global' }, (ctx) => {
  const { code, error, set } = ctx
  if (code === 'VALIDATION') {
    set.status = 422
    // Petakan ke objek polos agar tipe bisa di-emit ke .d.ts
    const details: { path: string; message: string }[] = error.all.map((e) => ({
      path: String(e.path),
      message: String(e.message),
    }))
    return { error: 'validation_error' as const, details }
  }
  if (code === 'NOT_FOUND') {
    set.status = 404
    return { error: 'not_found' as const }
  }
  console.error(JSON.stringify({ level: 'error', code, message: String((error as Error)?.message) }))
  set.status = 500
  return { error: 'internal_error' as const }
})
