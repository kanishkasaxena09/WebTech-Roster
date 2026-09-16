import https from 'node:https'
import fs from 'node:fs'

const BASE = 'https://webtech-roster.onrender.com'
let pass = 0, fail = 0

function check(name, condition, detail) {
  if (condition) { pass++; console.log(`  PASS: ${name}`) }
  else { fail++; console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`) }
}

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

async function main() {
  console.log('=== 1. Server starts & GET /data/projects ===')
  const r1 = await fetch('/data/projects')
  check('GET /data/projects returns HTTP 200', r1.status === 200, `got ${r1.status}`)

  const data = JSON.parse(r1.body)
  check('Response is an array', Array.isArray(data))

  console.log('\n=== 2. Data structure ===')
  check('Exactly 2 projects', data.length === 2, `got ${data.length}`)

  const web = data.find(p => p.id === 'web')
  const ml = data.find(p => p.id === 'ml')
  check('Web project exists', !!web)
  check('ML project exists', !!ml)

  if (web) {
    check('Web has 4 teams', web.teams.length === 4, `got ${web.teams.length}`)
    check('Web admin username', web.admin?.username === 'webadmin')
    const webMembers = web.teams.reduce((s, t) => s + (t.members?.length || 0), 0)
    check('Web has 9 members', webMembers === 9, `got ${webMembers}`)
    const webProgress = web.teams.reduce((s, t) => s + Object.keys(t.progress || {}).length, 0)
    check('Web has 24 progress records', webProgress === 24, `got ${webProgress}`)
  }

  if (ml) {
    check('ML has 2 teams', ml.teams.length === 2, `got ${ml.teams.length}`)
    check('ML admin username', ml.admin?.username === 'mladmin')
    const mlMembers = ml.teams.reduce((s, t) => s + (t.members?.length || 0), 0)
    check('ML has 3 members', mlMembers === 3, `got ${mlMembers}`)
    const mlProgress = ml.teams.reduce((s, t) => s + Object.keys(t.progress || {}).length, 0)
    check('ML has 12 progress records', mlProgress === 12, `got ${mlProgress}`)
  }

  const totalMembers = data.reduce((s, p) => s + p.teams.reduce((s2, t) => s2 + (t.members?.length || 0), 0), 0)
  const totalProgress = data.reduce((s, p) => s + p.teams.reduce((s2, t) => s2 + Object.keys(t.progress || {}).length, 0), 0)
  check('Total 12 members', totalMembers === 12, `got ${totalMembers}`)
  check('Total 36 progress records', totalProgress === 36, `got ${totalProgress}`)

  console.log('\n=== 3. Compare with production-projects.json ===')
  const prodData = JSON.parse(fs.readFileSync('production-projects.json', 'utf8'))
  let idMatch = true
  for (const p of prodData) {
    const a = data.find(x => x.id === p.id)
    if (!a) { idMatch = false; continue }
    if (p.teams.length !== a.teams.length) idMatch = false
    for (let i = 0; i < p.teams.length; i++) {
      if (p.teams[i].id !== (a.teams[i] || {}).id) idMatch = false
      if (p.teams[i].project !== (a.teams[i] || {}).project) idMatch = false
    }
  }
  check('Project/team IDs match production', idMatch)

  // Deep equality check
  const apiJSON = JSON.stringify(data)
  const prodJSON = JSON.stringify(prodData)
  check('Full JSON structure matches production', apiJSON === prodJSON)

  console.log('\n=== 4. ML teams specific ===')
  if (ml) {
    const mlTeamNames = ml.teams.map(t => t.project).sort()
    check('ML has Spam Classifier', mlTeamNames.includes('Spam Classifier'))
    check('ML has Image Recognizer', mlTeamNames.includes('Image Recognizer'))
    check('ML team IDs are t5 and t6', JSON.stringify(ml.teams.map(t => t.id).sort()) === JSON.stringify(['t5', 't6']))
  }

  console.log('\n=== 5. SSE /events ===')
  const r2 = await fetch('/events')
  check('SSE /events returns HTTP 200', r2.status === 200, `got ${r2.status}`)
  check('SSE has correct content-type', (r2.headers['content-type'] || '').includes('text/event-stream'))
  check('SSE initial ready event', r2.body.includes('"ready":true'))

  console.log('\n=== 6. Auth behavior ===')
  const r3 = await fetch('/data/projects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify('not array') })
  check('PUT non-array returns 400 (no token)', r3.status === 400, `got ${r3.status}`)

  const r4 = await fetch('/data/projects', { method: 'DELETE' })
  check('DELETE without token returns 403/401 (protected)', r4.status === 403 || r4.status === 401, `got ${r4.status}`)

  // Verify data still intact after rejected requests
  const r5 = await fetch('/data/projects')
  const dataAfter = JSON.parse(r5.body)
  check('Data intact after rejected requests', dataAfter.length === 2, `got ${dataAfter.length} projects`)

  console.log(`\n\nResults: ${pass} passed, ${fail} failed out of ${pass + fail} checks`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(err => { console.error('Error:', err.message); process.exit(1) })
