import http from 'node:http'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import pg from 'pg'

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
      if (!started && s.includes('Sync server running')) {
        started = true
        resolve(proc)
      }
    })
    proc.stderr.on('data', d => process.stderr.write(d))
    setTimeout(() => { if (!started) reject(new Error('Server start timeout')) }, 15000)
  })
}

const BASE = 'http://localhost:3000'
let pass = 0, fail = 0

function check(name, condition, detail) {
  if (condition) { pass++; console.log(`  PASS: ${name}`) }
  else { fail++; console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`) }
}

async function main() {
  const server = await startServer()
  await wait(500)

  try {
    // Load original production data for comparison
    const prodData = JSON.parse(fs.readFileSync('production-projects.json', 'utf8'))

    // === A. GET /data/projects ===
    console.log('=== A. GET /data/projects ===')
    const r1 = await httpRequest(`${BASE}/data/projects`)
    check('GET /data/projects returns 200', r1.status === 200, `got ${r1.status}`)
    const projects = JSON.parse(r1.body)
    check('GET /data/projects returns array', Array.isArray(projects))
    check('Projects count = 2', projects.length === 2, `got ${projects.length}`)

    const web = projects.find(p => p.id === 'web')
    const ml = projects.find(p => p.id === 'ml')
    check('Web project exists', !!web)
    check('ML project exists', !!ml)
    if (web) check('Web has 4 teams', web.teams.length === 4, `got ${web.teams.length}`)
    if (ml) check('ML has 2 teams', ml.teams.length === 2, `got ${ml.teams.length}`)

    const totalMembers = projects.reduce((s, p) => s + p.teams.reduce((s2, t) => s2 + (t.members?.length || 0), 0), 0)
    check('Total 12 members', totalMembers === 12, `got ${totalMembers}`)
    const totalProgress = projects.reduce((s, p) => s + p.teams.reduce((s2, t) => s2 + Object.keys(t.progress || {}).length, 0), 0)
    check('Total 36 progress records', totalProgress === 36, `got ${totalProgress}`)

    // === B. GET /data/admins ===
    console.log('\n=== B. GET /data/admins ===')
    const r2 = await httpRequest(`${BASE}/data/admins`)
    check('GET /data/admins returns 200', r2.status === 200, `got ${r2.status}`)
    let admins = null
    if (r2.status === 200) {
      admins = JSON.parse(r2.body)
      check('admins has main object', admins && typeof admins.main === 'object')
      check('admins.main has username', typeof admins.main?.username === 'string')
      check('admins.main has password', typeof admins.main?.password === 'string')
      check('admins.main has enabled', typeof admins.main?.enabled === 'boolean')
      console.log(`  (main admin username: "${admins.main?.username}", enabled: ${admins.main?.enabled})`)
    }

    // Save original values for restoration
    const origAdminUsername = admins?.main?.username
    const origAdminPassword = admins?.main?.password

    // === C. PUT /data/admins persists ===
    console.log('\n=== C. PUT /data/admins persists ===')
    const testAdmins = {
      main: { username: 'testadmin', password: 'testpass123', enabled: true, name: 'Test Admin' },
    }
    const r3 = await httpRequest(`${BASE}/data/admins`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': process.env.SYNC_TOKEN || '' },
      body: JSON.stringify(testAdmins),
    })
    check('PUT /data/admins returns 200', r3.status === 200, `got ${r3.status}`)

    await wait(200)
    const r4 = await httpRequest(`${BASE}/data/admins`)
    const savedAdmins = JSON.parse(r4.body)
    check('Persisted admins.main.username = testadmin', savedAdmins?.main?.username === 'testadmin', `got "${savedAdmins?.main?.username}"`)
    check('Persisted admins.main.password = testpass123', savedAdmins?.main?.password === 'testpass123', `got "${savedAdmins?.main?.password}"`)

    // === D. Main Admin login would work ===
    console.log('\n=== D. Main Admin login ===')
    check('admins.main.username matches persisted value', savedAdmins.main.username === 'testadmin')
    check('admins.main.password matches persisted value', savedAdmins.main.password === 'testpass123')
    check('admins.main.enabled is true', savedAdmins.main.enabled === true)

    // Restore original admins
    await httpRequest(`${BASE}/data/admins`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': process.env.SYNC_TOKEN || '' },
      body: JSON.stringify({ main: { username: origAdminUsername, password: origAdminPassword, enabled: true, name: 'Website Admin' } }),
    })
    await wait(200)

    // === E+F. Project Admin credentials change persists ===
    console.log('\n=== E+F. Project Admin credentials ===')
    const origWebAdmin = { ...web.admin }
    const origMlAdmin = { ...ml.admin }
    const modifiedProjects = JSON.parse(JSON.stringify(projects))
    modifiedProjects[0].admin.username = 'webadmin_test'
    modifiedProjects[0].admin.password = 'web_test_pass'

    const r5 = await httpRequest(`${BASE}/data/projects`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': process.env.SYNC_TOKEN || '' },
      body: JSON.stringify(modifiedProjects),
    })
    check('PUT /data/projects returns 200 (admin creds)', r5.status === 200, `got ${r5.status}`)

    await wait(200)
    const r6 = await httpRequest(`${BASE}/data/projects`)
    const afterAdminChange = JSON.parse(r6.body)
    const webAfter = afterAdminChange.find(p => p.id === 'web')
    check('Admin username persisted = webadmin_test', webAfter?.admin?.username === 'webadmin_test', `got "${webAfter?.admin?.username}"`)
    check('Admin password persisted = web_test_pass', webAfter?.admin?.password === 'web_test_pass', `got "${webAfter?.admin?.password}"`)

    // Restore
    modifiedProjects[0].admin = origWebAdmin
    await httpRequest(`${BASE}/data/projects`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': process.env.SYNC_TOKEN || '' },
      body: JSON.stringify(modifiedProjects),
    })
    await wait(200)

    // === G+H. Team credentials change persists ===
    console.log('\n=== G+H. Team credentials ===')
    const origT1 = { ...web.teams[0] }
    const modifiedProjects2 = JSON.parse(JSON.stringify(projects))
    modifiedProjects2[0].teams[0].username = 'propmatch_test'
    modifiedProjects2[0].teams[0].password = 'prop_test_pass'

    const r7 = await httpRequest(`${BASE}/data/projects`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': process.env.SYNC_TOKEN || '' },
      body: JSON.stringify(modifiedProjects2),
    })
    check('PUT /data/projects returns 200 (team creds)', r7.status === 200, `got ${r7.status}`)

    await wait(200)
    const r8 = await httpRequest(`${BASE}/data/projects`)
    const afterTeamChange = JSON.parse(r8.body)
    const t1After = afterTeamChange[0].teams.find(t => t.id === 't1')
    check('Team username persisted = propmatch_test', t1After?.username === 'propmatch_test', `got "${t1After?.username}"`)
    check('Team password persisted = prop_test_pass', t1After?.password === 'prop_test_pass', `got "${t1After?.password}"`)

    // Restore
    modifiedProjects2[0].teams[0].username = origT1.username
    modifiedProjects2[0].teams[0].password = origT1.password
    await httpRequest(`${BASE}/data/projects`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': process.env.SYNC_TOKEN || '' },
      body: JSON.stringify(modifiedProjects2),
    })
    await wait(200)

    // === I. Counts unchanged after restores ===
    console.log('\n=== I. Counts after restore ===')
    const r9 = await httpRequest(`${BASE}/data/projects`)
    const finalProjects = JSON.parse(r9.body)
    const fWeb = finalProjects.find(p => p.id === 'web')
    const fMl = finalProjects.find(p => p.id === 'ml')
    check('Final projects count = 2', finalProjects.length === 2)
    check('Final web teams = 4', fWeb?.teams?.length === 4)
    check('Final ml teams = 2', fMl?.teams?.length === 2)
    const fMembers = finalProjects.reduce((s, p) => s + p.teams.reduce((s2, t) => s2 + (t.members?.length || 0), 0), 0)
    check('Final 12 members', fMembers === 12)
    const fProgress = finalProjects.reduce((s, p) => s + p.teams.reduce((s2, t) => s2 + Object.keys(t.progress || {}).length, 0), 0)
    check('Final 36 progress records', fProgress === 36)

    // Verify exact match with production
    check('Final JSON matches production', JSON.stringify(finalProjects) === JSON.stringify(prodData))

    // === J. SSE /events ===
    console.log('\n=== J. SSE /events ===')
    const r10 = await httpRequest(`${BASE}/events`)
    check('SSE /events returns 200', r10.status === 200)
    check('SSE has event-stream content-type', (r10.headers['content-type'] || '').includes('text/event-stream'))

    // === K. Unauthorized PUT/DELETE returns 401 ===
    console.log('\n=== K. Unauthorized PUT/DELETE ===')
    const r11 = await httpRequest(`${BASE}/data/projects`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('test'),
    })
    check('PUT without token returns 401', r11.status === 401, `got ${r11.status}`)

    const r12 = await httpRequest(`${BASE}/data/projects`, { method: 'DELETE' })
    check('DELETE without token returns 401', r12.status === 401, `got ${r12.status}`)

    // === L. Sync token behavior ===
    console.log('\n=== L. Sync token behavior ===')
    const r13 = await httpRequest(`${BASE}/data/projects`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': 'wrong-token' },
      body: JSON.stringify('test'),
    })
    check('PUT with wrong token returns 401', r13.status === 401, `got ${r13.status}`)

  } finally {
    server.kill()
  }

  console.log(`\n\nResults: ${pass} passed, ${fail} failed out of ${pass + fail} checks`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(err => { console.error('Test runner error:', err); process.exit(1) })
