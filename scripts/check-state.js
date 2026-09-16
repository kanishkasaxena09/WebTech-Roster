import http from 'node:http'
import fs from 'node:fs'
import pg from 'pg'
import 'dotenv/config'

async function main() {
  const c = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  const client = await c.connect()

  // Check kv_store state
  const { rows: kv } = await client.query("SELECT key, value FROM kv_store")
  console.log('kv_store entries:', kv.length)
  for (const r of kv) {
    console.log(`  key="${r.key}" value=`, JSON.stringify(r.value).substring(0, 200))
  }

  // Check if production data matches
  const { rows: projects } = await client.query('SELECT COUNT(*) as c FROM projects')
  const { rows: teams } = await client.query('SELECT COUNT(*) as c FROM teams')
  const { rows: members } = await client.query('SELECT COUNT(*) as c FROM team_members')
  const { rows: progress } = await client.query('SELECT COUNT(*) as c FROM team_progress')
  console.log(`\nprojects: ${projects[0].c}, teams: ${teams[0].c}, members: ${members[0].c}, progress: ${progress[0].c}`)

  // Check progress values
  const { rows: progRows } = await client.query("SELECT team_id, progress_key, completed FROM team_progress WHERE completed = true")
  console.log(`\nCompleted progress entries: ${progRows.length}`)
  for (const r of progRows) {
    console.log(`  ${r.team_id}.${r.progress_key} = true`)
  }

  client.release()
  await c.end()
}

main().catch(err => { console.error(err.message); process.exit(1) })
