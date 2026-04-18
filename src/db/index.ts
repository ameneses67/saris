import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export function getDb(env: Env) {
  return drizzle(env.saris_db, { schema })
}

export type Database = ReturnType<typeof getDb>
