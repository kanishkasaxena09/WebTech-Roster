import 'dotenv/config'
import http from 'node:http'
import pg from 'pg'

const PORT = process.env.PORT || 3000
const TOKEN = process.env.SYNC_TOKEN || ''

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : (process.env.PGHOST || '127.0.0.1'),
  port: process.env.DATABASE_URL ? undefined : Number(process.env.PGPORT || 5432),
  user: process.env.DATABASE_URL ? undefined : (process.env.PGUSER || 'postgres'),
  password: process.env.DATABASE_URL ? undefined : (process.env.PGPASSWORD || ''),
  database: process.env.DATABASE_URL ? undefined : (process.env.PGDATABASE || 'webtech_roster'),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.PGSSLMODE === 'require' || process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
})

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      admin_username VARCHAR(255) NOT NULL,
      admin_password VARCHAR(255) NOT NULL,
      insert_order INTEGER NOT NULL DEFAULT 0
    )
  `)
  await client.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      project_name VARCHAR(255) NOT NULL,
      leader VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      username VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      insert_order INTEGER NOT NULL DEFAULT 0
    )
  `)
  await client.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      member_name VARCHAR(255) NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `)
  await client.query(`
    CREATE TABLE IF NOT EXISTS team_progress (
      team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      progress_key VARCHAR(64) NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false,
      PRIMARY KEY (team_id, progress_key)
    )
  `)
  await client.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key VARCHAR(64) PRIMARY KEY,
      value JSONB NOT NULL
    )
  `)
}

async function loadProjects() {
  const { rows: projectRows } = await pool.query('SELECT * FROM projects ORDER BY insert_order')
  if (projectRows.length === 0) return []

  const { rows: teamRows } = await pool.query('SELECT * FROM teams ORDER BY insert_order')
  const { rows: memberRows } = await pool.query('SELECT * FROM team_members ORDER BY sort_order')
  const { rows: progressRows } = await pool.query('SELECT * FROM team_progress')

  const membersByTeam = {}
  for (const m of memberRows) {
    if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = []
    membersByTeam[m.team_id].push(m.member_name)
  }

  const progressByTeam = {}
  for (const p of progressRows) {
    if (!progressByTeam[p.team_id]) progressByTeam[p.team_id] = {}
    progressByTeam[p.team_id][p.progress_key] = !!p.completed
  }

  const teamsByProject = {}
  for (const t of teamRows) {
    if (!teamsByProject[t.project_id]) teamsByProject[t.project_id] = []
    teamsByProject[t.project_id].push({
      id: t.id,
      project: t.project_name,
      leader: t.leader,
      description: t.description || '',
      username: t.username,
      password: t.password,
      members: membersByTeam[t.id] || [],
      progress: progressByTeam[t.id] || {},
    })
  }

  return projectRows.map(p => ({
    id: p.id,
    name: p.name,
    admin: { username: p.admin_username, password: p.admin_password },
    teams: teamsByProject[p.id] || [],
  }))
}

async function saveProjects(projects) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query('DELETE FROM team_progress')
    await client.query('DELETE FROM team_members')
    await client.query('DELETE FROM teams')
    await client.query('DELETE FROM projects')

    for (let pi = 0; pi < projects.length; pi++) {
      const p = projects[pi]
      await client.query(
        'INSERT INTO projects (id, name, admin_username, admin_password, insert_order) VALUES ($1, $2, $3, $4, $5)',
        [p.id, p.name, p.admin?.username || 'admin', p.admin?.password || 'admin123', pi]
      )

      for (let ti = 0; ti < (p.teams || []).length; ti++) {
        const t = p.teams[ti]
        await client.query(
          'INSERT INTO teams (id, project_id, project_name, leader, description, username, password, insert_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [t.id, p.id, t.project, t.leader, t.description || '', t.username, t.password, ti]
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
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function loadAdmins() {
  const { rows } = await pool.query("SELECT value FROM kv_store WHERE key = 'admins'")
  if (rows.length === 0) return null
  return rows[0].value
}

async function saveAdmins(value) {
  await pool.query(
    "INSERT INTO kv_store (key, value) VALUES ('admins', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
    [JSON.stringify(value)]
  )
}

async function deleteAllProjects() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM team_progress')
    await client.query('DELETE FROM team_members')
    await client.query('DELETE FROM teams')
    await client.query('DELETE FROM projects')
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const sseClients = new Set()

function broadcast(key, value) {
  const payload = `data: ${JSON.stringify({ key, value })}\n\n`
  for (const res of sseClients) {
    try { res.write(payload) } catch { sseClients.delete(res) }
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(body === undefined ? JSON.stringify(null) : JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 2_000_000) {
        reject(new Error('payload too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function authorized(req) {
  if (!TOKEN) return true
  return req.headers['x-sync-token'] === TOKEN
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  const cors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-sync-token')
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  }
  cors()

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    })
    res.write(`data: ${JSON.stringify({ ready: true })}\n\n`)
    sseClients.add(res)
    req.on('close', () => sseClients.delete(res))
    return
  }

  const match = url.pathname.match(/^\/data\/([^/]+)$/)
  if (!match) {
    send(res, 404, { error: 'Not found' })
    return
  }
  const key = decodeURIComponent(match[1])

  try {
    if (req.method === 'GET') {
      if (key === 'projects') {
        const projects = await loadProjects()
        send(res, 200, projects)
      } else if (key === 'admins') {
        const admins = await loadAdmins()
        if (admins) send(res, 200, admins)
        else send(res, 404, { error: 'Key not found' })
      } else {
        send(res, 404, { error: 'Key not found' })
      }
      return
    }

    if (!authorized(req)) {
      send(res, 401, { error: 'Missing or wrong sync token' })
      return
    }

    if (req.method === 'PUT') {
      const body = await readBody(req)
      let value
      try {
        value = JSON.parse(body)
      } catch {
        send(res, 400, { error: 'Body must be valid JSON' })
        return
      }

      if (key === 'projects') {
        if (!Array.isArray(value)) {
          send(res, 400, { error: 'projects value must be an array' })
          return
        }
        await saveProjects(value)
        broadcast(key, value)
        send(res, 200, { ok: true })
      } else if (key === 'admins') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          send(res, 400, { error: 'admins value must be an object' })
          return
        }
        await saveAdmins(value)
        broadcast(key, value)
        send(res, 200, { ok: true })
      } else {
        send(res, 400, { error: 'Only "projects" and "admins" keys are supported' })
      }
      return
    }

    if (req.method === 'DELETE') {
      if (key === 'projects') {
        await deleteAllProjects()
        broadcast(key, null)
        send(res, 200, { ok: true })
      } else {
        send(res, 404, { error: 'Key not found' })
      }
      return
    }

    send(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    send(res, 500, { error: 'Server error' })
  }
})

const HEARTBEAT_MS = 15000
setInterval(() => {
  if (sseClients.size === 0) return
  for (const res of sseClients) {
    try { res.write(': ping\n\n') } catch { sseClients.delete(res) }
  }
}, HEARTBEAT_MS).unref()

async function start() {
  const client = await pool.connect()
  try {
    console.log('PostgreSQL connection successful')
    await ensureSchema(client)
    console.log('PostgreSQL schema ready')

    const { rows } = await client.query("SELECT 1 FROM kv_store WHERE key = 'admins' LIMIT 1")
    if (rows.length === 0) {
      const defaultAdmins = {
        main: {
          username: 'mainadmin',
          password: 'main123',
          enabled: true,
          name: 'Website Admin',
        },
      }
      await client.query(
        "INSERT INTO kv_store (key, value) VALUES ('admins', $1)",
        [JSON.stringify(defaultAdmins)]
      )
      console.log('Default Main Admin account initialized.')
    }
  } finally {
    client.release()
  }

  server.listen(PORT, () => {
    console.log(`Sync server running at http://localhost:${PORT}`)
    console.log(TOKEN ? 'Writes require the sync token.' : 'Writes are open (no sync token set).')
  })
}

async function shutdown() {
  console.log('\nShutting down...')
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
