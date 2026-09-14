import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = process.env.PORT || 3000
const TOKEN = process.env.SYNC_TOKEN || '' // optional: set to protect writes
const DB_DIR = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = process.env.DB_FILE ? path.resolve(process.env.DB_FILE) : path.join(DB_DIR, 'data.json')

let data = {}
try {
  data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
} catch {
  data = {}
}

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
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
      if (!(key in data)) {
        send(res, 404, { error: 'Key not found' })
      } else {
        send(res, 200, data[key])
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
      data[key] = value
      save()
      broadcast(key, value)
      send(res, 200, { ok: true })
      return
    }

    if (req.method === 'DELETE') {
      delete data[key]
      save()
      broadcast(key, null)
      send(res, 200, { ok: true })
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

server.listen(PORT, () => {
  console.log(`Sync server running at http://localhost:${PORT}`)
  console.log(`Data file: ${DB_FILE}`)
  console.log(TOKEN ? 'Writes require the sync token.' : 'Writes are open (no sync token set).')
})