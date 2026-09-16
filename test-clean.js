import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
})

const client = await pool.connect()
await client.query('DELETE FROM team_progress')
await client.query('DELETE FROM team_members')
await client.query('DELETE FROM teams')
await client.query('DELETE FROM projects')
const { rows } = await client.query('SELECT COUNT(*) AS c FROM projects')
console.log('Projects remaining:', rows[0].c)
client.release()
await pool.end()
