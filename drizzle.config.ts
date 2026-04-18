import { defineConfig } from 'drizzle-kit'

// Las migraciones se aplican con:
//   npx wrangler d1 execute saris-db --remote --file=./drizzle/<archivo>.sql
// Para desarrollo local:
//   npx wrangler d1 execute saris-db --local --file=./drizzle/<archivo>.sql
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
})
