import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('posts_created_at_idx').on(t.createdAt)],
)

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
