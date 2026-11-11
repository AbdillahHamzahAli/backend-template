import { desc } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { db } from '../db/client'
import { posts as postsTable } from '../db/schema'
import { bumpNs, cached, nsVersion } from '../lib/cache'

const PAGE_SIZE = 20

export const posts = new Elysia({ prefix: '/posts' })
  .get(
    '/',
    async ({ query }) => {
      const v = await nsVersion('posts')
      return cached(`posts:${v}:list:${query.page}`, 30, () =>
        db
          .select()
          .from(postsTable)
          .orderBy(desc(postsTable.createdAt))
          .limit(PAGE_SIZE)
          .offset((query.page - 1) * PAGE_SIZE),
      )
    },
    { query: t.Object({ page: t.Numeric({ minimum: 1, default: 1 }) }) },
  )
  .post(
    '/',
    async ({ body, set }) => {
      const [row] = await db.insert(postsTable).values(body).returning()
      await bumpNs('posts')
      set.status = 201
      return row
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 200 }),
        body: t.Optional(t.String({ maxLength: 20000 })),
      }),
    },
  )
