import { SQL } from 'bun'
import { drizzle } from 'drizzle-orm/bun-sql'
import { migrate } from 'drizzle-orm/bun-sql/migrator'

const sql = new SQL(process.env.DATABASE_URL!)
await migrate(drizzle({ client: sql }), { migrationsFolder: './drizzle' })
await sql.close()
console.log('migrated')
