import { Elysia } from 'elysia'
import { getRequestContext, requestId } from './request-id'

type LogLevel = 'info' | 'error'

const getIp = (request: Request, server: { requestIP?: (request: Request) => { address?: string } | null } | null) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? server?.requestIP?.(request)?.address ?? 'unknown'

const getStatus = (set: { status?: number | string }, response: unknown, fallback: number) => {
  if (response instanceof Response) return response.status
  return typeof set.status === 'number' ? set.status : fallback
}

const writeRequestLog = ({
  level,
  request,
  requestId,
  server,
  set,
  response,
  startedAt,
}: {
  level: LogLevel
  request: Request
  requestId: string
  server: { requestIP?: (request: Request) => { address?: string } | null } | null
  set: { status?: number | string }
  response: unknown
  startedAt: number
}) => {
  const status = getStatus(set, response, level === 'error' ? 500 : 200)
  console.log(
    JSON.stringify({
      level,
      msg: 'request',
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      status,
      durationMs: Math.round(performance.now() - startedAt),
      ip: getIp(request, server),
      userAgent: request.headers.get('user-agent') ?? null,
      // Auth belum tersedia; field ini disiapkan agar format log stabil.
      userId: null,
    }),
  )
}

export const requestLogging = new Elysia({ name: 'request-logging' })
  .use(requestId)
  .onAfterHandle({ as: 'global' }, ({ request, requestId, server, set, responseValue }) => {
    const context = getRequestContext(request)
    writeRequestLog({
      level: 'info',
      request,
      requestId,
      server,
      set,
      response: responseValue,
      startedAt: context?.startedAt ?? performance.now(),
    })
  })
  .onError({ as: 'global' }, ({ request, server, set, error }) => {
    const context = getRequestContext(request)
    writeRequestLog({
      level: 'error',
      request,
      requestId: context?.requestId ?? request.headers.get('x-request-id') ?? 'unknown',
      server,
      set,
      response: error,
      startedAt: context?.startedAt ?? performance.now(),
    })
  })
