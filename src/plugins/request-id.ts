import { Elysia } from 'elysia'

const requestContext = new WeakMap<Request, { requestId: string; startedAt: number }>()

export const getRequestContext = (request: Request) => requestContext.get(request)

export const requestId = new Elysia({ name: 'request-id' }).derive({ as: 'global' }, ({ request, set }) => {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  requestContext.set(request, { requestId, startedAt: performance.now() })
  set.headers['x-request-id'] = requestId
  return { requestId }
})
