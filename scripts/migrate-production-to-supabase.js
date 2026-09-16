#!/usr/bin/env node
import 'dotenv/config'
import fs from 'node:fs'
import pg from 'pg'

const FILE = process.argv[2] || 'production-projects.json'
const ALLOW_EMPTY = process.argv.includes('--allow-empty')

async function main() {
  if (!fs.existsSync(FILE)) {
    console.error(`Error: File "${FILE}" not found.`)
    console.error('Usage: node scripts/migrate-production-to-supabase.js [path-to-json]')
    console.error('Example: node scripts/migrate-production-to-supabase.js production-projects.json')
    process.exit(1)
  }

  let raw
  try {
    raw = fs.readFileSync(FILE, 'utf8')
  } catch (err) {
    console.error(`Error: Could not read file "${FILE}": ${err.message}`)
    process.exit(1)
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    console.error(`Error: File "${FILE}" is not valid JSON: ${err.message}`)
    process.exit(1)
  }

  if (!Array.isArray(data)) {
    console.error('Error: JSON root must be an array of project objects.')
    process.exit(1)
  }

  if (data.length === 0 && !ALLOW_EMPTY) {
    console.error('Error: Array is empty. Refusing to overwrite database with no projects.')
    console.error('Use --allow-empty to proceed anyway.')
    process.exit(1)
  }

  const errors = []
  for (let i = 0; i < data.length; i++) {
    const p = data[i]
    if (!p.id || typeof p.id !== 'string') errors.push(`Project[${i}]: missing or invalid "id"`)
    if (!p.name || typeof p.name !== 'string') errors.push(`Project[${i}] (${p.id}): missing or invalid "name"`)
    if (!p.admin || typeof p.admin !== 'object') errors.push(`Project[${i}] (${p.id}): missing "admin" object`)
    if (!Array.isArray(p.teams)) errors.push(`Project[${i}] (${p.id}): missing or invalid "teams" array`)
  }

  if (errors.length > 0) {
    console.error('Validation errors:')
    errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Error: DATABASE_URL environment variable is not set.')
    process.exit(1)
  }

  console.log(`Connecting to PostgreSQL...`)
  const pool = new pg.Pool({
    connectionString: url,
    ssl: url.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query('DELETE FROM team_progress')
    await client.query('DELETE FROM team_members')
    await client.query('DELETE FROM teams')
    await client.query('DELETE FROM projects')

    for (let pi = 0; pi < data.length; pi++) {
      const p = data[pi]
      await client.query(
        'INSERT INTO projects (id, name, admin_username, admin_password, insert_order) VALUES ($1, $2, $3, $4, $5)',
        [p.id, p.name, p.admin?.username || 'admin', p.admin?.password || 'admin123', pi]
      )

      for (let ti = 0; ti < (p.teams || []).length; ti++) {
        const t = p.teams[ti]
        await client.query(
          'INSERT INTO teams (id, project_id, project_name, leader, description, username, password, insert_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [t.id, p.id, t.project || '', t.leader || '', t.description || '', t.username || '', t.password || '', ti]
        )

        for (let i = 0; i < (t.members || []).length; i++) {
          await client.query(
            'INSERT INTO team_members (team_id, member_name, sort_order) VALUES ($1, $2, $3)',
            [t.id, t.members[i], i]
          )
        }

        if (t.progress && typeof t.progress === 'object') {
          for (const [key, val] of Object.entries(t.progress)) {
            await client.query(
              'INSERT INTO team_progress (team_id, progress_key, completed) VALUES ($1, $2, $3)',
              [t.id, key, !!val]
            )
          }
        }
      }
    }

    await client.query('COMMIT')

    const { rows } = await client.query('SELECT COUNT(*) AS count FROM projects')
    console.log(`Migration complete. ${rows[0].count} project(s) imported.`)

    const { rows: teamCount } = await client.query('SELECT COUNT(*) AS count FROM teams')
    console.log(`  ${teamCount[0].count} team(s) imported.`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(`Migration failed: ${err.message}`)
    console.error('All changes have been rolled back.')
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
