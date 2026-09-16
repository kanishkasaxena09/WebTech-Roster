import http from 'node:http'
import { spawn } from 'node:child_process'

function httpRequest(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname,
      method: opts.method || 'GET', headers: opts.headers || {},
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    if (opts.body) req.write(opts.body)
    req.end()
  })
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)) }

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['server.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
    })
    let started = false
    proc.stdout.on('data', d => {
      const s = d.toString()
      process.stdout.write(s)
      if (!started && s.includes('Sync server running')) { started = true; resolve(proc) }
    })
    proc.stderr.on('data', d => process.stderr.write(d))
    proc.on('error', reject)
    setTimeout(() => { if (!started) reject(new Error('timeout')) }, 15000)
  })
}

function ep() { return { documentation: false, erd: false, prototype: false, coreBuild: false, testing: false, deployment: false } }

const seedData = [
  { id: 'web', name: 'Web Project', admin: { username: 'webadmin', password: 'web123' },
    teams: [
      { id: 't1', project: 'PropMatch', leader: 'Sudhanshu', members: ['Vishal', 'Suryansh'], description: 'Desc1', username: 'propmatch', password: 'prop1234', progress: ep() },
      { id: 't2', project: 'CampusFind', leader: 'Arifa', members: ['Aaradhya', 'Abhishek', 'Ajad'], description: 'Desc2', username: 'campusfind', password: 'campus1234', progress: ep() },
    ]
  },
  { id: 'ml', name: 'ML Project', admin: { username: 'mladmin', password: 'ml123' },
    teams: [
      { id: 't5', project: 'Spam Classifier', leader: 'Ritika', members: ['Mohit', 'Priya'], description: 'Desc3', username: 'spamclassifier', password: 'spam1234', progress: ep() },
    ]
  }
]

async function run() {
  const server = await startServer()
  await wait(500)

  // Seed
  const putR = await httpRequest('http://localhost:3000/data/projects', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seedData),
  })
  console.log('Seed PUT:', putR.status, putR.body)

  // Read back
  const getR = await httpRequest('http://localhost:3000/data/projects')
  const data = JSON.parse(getR.body)
  console.log('After seed - web teams:', data[0].teams.length, 'ml teams:', data[1].teams.length)

  // Modify only web project
  data[0].teams[0].progress.documentation = true
  const body = JSON.stringify(data)
  console.log('\nSending PUT with modified data...')
  console.log('Body ml teams count:', JSON.parse(body)[1].teams.length)

  const putR2 = await httpRequest('http://localhost:3000/data/projects', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: body,
  })
  console.log('Update PUT:', putR2.status, putR2.body)

  // Read back
  const getR2 = await httpRequest('http://localhost:3000/data/projects')
  const data2 = JSON.parse(getR2.body)
  console.log('\nAfter update:')
  for (const p of data2) {
    console.log(`  Project: ${p.id} (${p.name}) - ${p.teams.length} teams`)
    for (const t of p.teams) {
      console.log(`    Team: ${t.id} (${t.project}) - members: ${t.members.length}, progress.doc: ${t.progress.documentation}`)
    }
  }

  server.kill()
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
