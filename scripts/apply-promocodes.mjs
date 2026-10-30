import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

for (const filename of ['.env.local', '.env']) {
  if (existsSync(filename)) dotenv.config({ path: filename, quiet: true })
}
const sql = readFileSync(fileURLToPath(new URL('../migrations/20261030_promocodes.sql', import.meta.url)), 'utf8')
if (process.argv.includes('--print')) {
  process.stdout.write(sql)
} else {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL securely, or run the SQL migration in Supabase SQL Editor')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    await client.query(sql)
    console.log('PromoCode table and order discount fields are ready.')
  } catch (error) {
    console.error('Не удалось применить миграцию. Проверьте подключение и права базы.', error.code ?? '')
    process.exitCode = 1
  } finally { await client.end() }
}
