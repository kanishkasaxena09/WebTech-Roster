import https from 'node:https'
import fs from 'node:fs'

const BASE = 'https://webtech-roster.onrender.com'
const TOKEN = process.env.SYNC_TOKEN || ''
let pass = 0, fail = 0

function fetch(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE)
    const reqOpts = { hostname: url.hostname, port: 443, path: url.pathname, method: opts.method || 'GET', headers: opts.headers || {}, timeout: 30000 }
    const req = https.request(reqOpts, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    if (opts.body) req.write(opts.body)
    req.end()
  })
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)) }

function check(name, condition, detail) {
  if (condition) { pass++; console.log(`  PASS: ${name}`) }
  else { fail++; console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`) }
}

async function main() {
  console.log('=== A. GET /data/projects ===')
  const r1 = await fetch('/data/projects')
  check('GET /data/projects returns 200', r1.status === 200, `got ${r1.status}`)
  const projects = JSON.parse(r1.body)
  check('Response is array', Array.isArray(projects))
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
  check('Total 36 progress', totalProgress === 36, `got ${totalProgress}`)

  console.log('\n=== B. GET /data/admins ===')
  const r2 = await fetch('/data/admins')
  check('GET /data/admins returns 200', r2.status === 200, `got ${r2.status}`)
  let admins = null
  if (r2.status === 200) {
    admins = JSON.parse(r2.body)
    check('admins has main object', admins && typeof admins.main === 'object')
    check('admins.main.username exists', typeof admins.main?.username === 'string')
    check('admins.main.password exists', typeof admins.main?.password === 'string')
    check('admins.main.enabled exists', typeof admins.main?.enabled === 'boolean')
    console.log(`    (main admin: "${admins.main?.username}", enabled: ${admins.main?.enabled})`)
  }

  const origAdmins = admins ? JSON.parse(JSON.stringify(admins)) : null

  console.log('\n=== C. PUT /data/admins persists ===')
  if (origAdmins) {
    const testVal = { main: { username: 'testadmin_rt', password: 'testpass_rt', enabled: true, name: 'Test RT' } }
    const r3 = await fetch('/data/admins', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': TOKEN },
      body: JSON.stringify(testVal),
    })
    check('PUT /data/admins returns 200', r3.status === 200, `got ${r3.status}`)
    await wait(500)
    const r4 = await fetch('/data/admins')
    const saved = JSON.parse(r4.body)
    check('Persisted username = testadmin_rt', saved?.main?.username === 'testadmin_rt', `got "${saved?.main?.username}"`)
    check('Persisted password = testpass_rt', saved?.main?.password === 'testpass_rt', `got "${saved?.main?.password}"`)

    // Restore
    await fetch('/data/admins', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': TOKEN },
      body: JSON.stringify(origAdmins),
    })
    await wait(500)
  }

  console.log('\n=== D. Main Admin login support ===')
  const r5 = await fetch('/data/admins')
  if (r5.status === 200) {
    const a = JSON.parse(r5.body)
    check('admins.main.username restored', a?.main?.username === origAdmins?.main?.username)
    check('admins.main.password restored', a?.main?.password === origAdmins?.main?.password)
    check('admins.main.enabled is true', a?.main?.enabled === true)
  }

  console.log('\n=== E+F. Project Admin credentials ===')
  const origWebAdmin = web?.admin ? { ...web.admin } : null
  if (origWebAdmin) {
    const modProj = JSON.parse(JSON.stringify(projects))
    modProj[0].admin.username = 'webadmin_test_rt'
    modProj[0].admin.password = 'web_test_rt'
    const r6 = await fetch('/data/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': TOKEN },
      body: JSON.stringify(modProj),
    })
    check('PUT projects (admin creds) returns 200', r6.status === 200, `got ${r6.status}`)
    await wait(500)
    const r7 = await fetch('/data/projects')
    const after = JSON.parse(r7.body)
    const webAfter = after.find(p => p.id === 'web')
    check('Admin username persisted', webAfter?.admin?.username === 'webadmin_test_rt')
    check('Admin password persisted', webAfter?.admin?.password === 'web_test_rt')

    // Restore
    modProj[0].admin = origWebAdmin
    await fetch('/data/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': TOKEN },
      body: JSON.stringify(modProj),
    })
    await wait(500)
  }

  console.log('\n=== G+H. Team credentials ===')
  const origT1 = web?.teams?.[0] ? { username: web.teams[0].username, password: web.teams[0].password } : null
  if (origT1) {
    const modProj = JSON.parse(JSON.stringify(projects))
    modProj[0].teams[0].username = 'propmatch_test_rt'
    modProj[0].teams[0].password = 'prop_test_rt'
    const r8 = await fetch('/data/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': TOKEN },
      body: JSON.stringify(modProj),
    })
    check('PUT projects (team creds) returns 200', r8.status === 200, `got ${r8.status}`)
    await wait(500)
    const r9 = await fetch('/data/projects')
    const after = JSON.parse(r9.body)
    const t1 = after[0]?.teams?.find(t => t.id === 't1')
    check('Team username persisted', t1?.username === 'propmatch_test_rt')
    check('Team password persisted', t1?.password === 'prop_test_rt')

    // Restore
    modProj[0].teams[0].username = origT1.username
    modProj[0].teams[0].password = origT1.password
    await fetch('/data/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-token': TOKEN },
      body: JSON.stringify(modProj),
    })
    await wait(500)
  }

  console.log('\n=== I. Counts after restore ===')
  const r10 = await fetch('/data/projects')
  const finalProj = JSON.parse(r10.body)
  check('Final projects = 2', finalProj.length === 2)
  check('Final web teams = 4', finalProj.find(p => p.id === 'web')?.teams?.length === 4)
  check('Final ml teams = 2', finalProj.find(p => p.id === 'ml')?.teams?.length === 2)
  const fMembers = finalProj.reduce((s, p) => s + p.teams.reduce((s2, t) => s2 + (t.members?.length || 0), 0), 0)
  check('Final 12 members', fMembers === 12)
  const fProgress = finalProj.reduce((s, p) => s + p.teams.reduce((s2, t) => s2 + Object.keys(t.progress || {}).length, 0), 0)
  check('Final 36 progress', fProgress === 36)

  console.log('\n=== J. SSE /events ===')
  try {
    const r11 = await fetch('/events')
    check('SSE /events returns 200', r11.status === 200, `got ${r11.status}`)
    check('SSE content-type is event-stream', (r11.headers['content-type'] || '').includes('text/event-stream'))
  } catch { check('SSE /events responds', false, 'timeout/error') }

  console.log('\n=== K. Unauthorized PUT/DELETE ===')
  const r12 = await fetch('/data/projects', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify('test'),
  })
  check('PUT without token returns 401', r12.status === 401, `got ${r12.status}`)
  const r13 = await fetch('/data/projects', { method: 'DELETE' })
  check('DELETE without token returns 401', r13.status === 401, `got ${r13.status}`)

  console.log('\n=== L. Sync token behavior ===')
  const r14 = await fetch('/data/projects', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-sync-token': 'wrong-token' },
    body: JSON.stringify('test'),
  })
  check('PUT with wrong token returns 401', r14.status === 401, `got ${r14.status}`)

  console.log(`\n\nResults: ${pass} passed, ${fail} failed out of ${pass + fail} checks`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(err => { console.error('Error:', err.message); process.exit(1) })
