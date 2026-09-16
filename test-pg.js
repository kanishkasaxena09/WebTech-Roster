import http from 'node:http'
import { spawn } from 'node:child_process'
import fs from 'node:fs'

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

function startServer(extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['server.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
    })
    let started = false
    proc.stdout.on('data', d => {
      const s = d.toString()
      process.stdout.write(s)
      if (!started && s.includes('Sync server running')) {
        started = true
        resolve(proc)
      }
    })
    proc.stderr.on('data', d => process.stderr.write(d))
    proc.on('error', reject)
    setTimeout(() => { if (!started) reject(new Error('Server start timeout')) }, 15000)
  })
}

function emptyProgress() {
  return { documentation: false, erd: false, prototype: false, coreBuild: false, testing: false, deployment: false }
}

const seedData = [
  {
    id: 'web', name: 'Web Project',
    admin: { username: 'webadmin', password: 'web123' },
    teams: [
      { id: 't1', project: 'PropMatch', leader: 'Sudhanshu Mathur', members: ['Vishal Shrivastav', 'Suryansh Sharma'], description: 'A platform that matches renters with suitable properties.', username: 'propmatch', password: 'prop1234', progress: emptyProgress() },
      { id: 't2', project: 'CampusFind', leader: 'Arifa Tahir', members: ['Aaradhya Saxena', 'Abhishek Saxena', 'Ajad Babu'], description: 'Helps students find and report lost items on campus.', username: 'campusfind', password: 'campus1234', progress: { documentation: true, erd: false, prototype: false, coreBuild: false, testing: false, deployment: false } },
      { id: 't3', project: 'Job and Placement Portal', leader: 'Kanishka Saxena', members: ['Akanksha Raghav', 'Amit Maurya', 'Vijender Kumar'], description: 'Connects students with internship and placement opportunities.', username: 'jobportal', password: 'job1234', progress: emptyProgress() },
      { id: 't4', project: 'BookMyShow Clone', leader: 'Prashant Gangwar', members: ['Naitik Bhardwaj'], description: 'A movie/event ticket booking web app.', username: 'bookmyshow', password: 'book1234', progress: emptyProgress() },
    ]
  },
  {
    id: 'ml', name: 'ML Project',
    admin: { username: 'mladmin', password: 'ml123' },
    teams: [
      { id: 't5', project: 'Spam Classifier', leader: 'Ritika Jain', members: ['Mohit Verma', 'Priya Singh'], description: 'Detects spam emails using a text classification model.', username: 'spamclassifier', password: 'spam1234', progress: emptyProgress() },
      { id: 't6', project: 'Image Recognizer', leader: 'Aman Gupta', members: ['Simran Kaur'], description: 'Recognizes everyday objects in images with a CNN.', username: 'imagerecog', password: 'img1234', progress: emptyProgress() },
    ]
  }
]

async function run() {
  const server = await startServer()
  await wait(500)

  let pass = 0, fail = 0

  async function test(name, fn) {
    try {
      await fn()
      console.log(`\n  PASS: ${name}`)
      pass++
    } catch (err) {
      console.log(`\n  FAIL: ${name}`)
      console.log(`    ${err.message}`)
      fail++
    }
  }

  function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'assertion failed')
  }

  // === BASIC CRUD ===

  await test('GET /data/projects returns empty array on fresh DB', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects')
    assert(r.status === 200)
    const data = JSON.parse(r.body)
    assert(Array.isArray(data), 'not an array')
    assert(data.length === 0, `expected 0, got ${data.length}`)
  })

  await test('PUT /data/projects stores data correctly', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seedData),
    })
    assert(r.status === 200, `status ${r.status}: ${r.body}`)
  })

  await test('GET after PUT returns exact structure match', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects')
    assert(r.status === 200)
    const data = JSON.parse(r.body)
    assert(data.length === 2, `expected 2 projects, got ${data.length}`)

    let errors = []
    for (let i = 0; i < seedData.length; i++) {
      const orig = seedData[i]
      const pg = data[i]
      if (!pg) { errors.push(`project[${i}] missing`); continue }
      if (orig.id !== pg.id) errors.push(`project[${i}].id: "${pg.id}" !== "${orig.id}"`)
      if (orig.name !== pg.name) errors.push(`project[${i}].name: "${pg.name}" !== "${orig.name}"`)
      if (orig.admin.username !== pg.admin.username) errors.push(`project[${i}].admin.username`)
      if (orig.admin.password !== pg.admin.password) errors.push(`project[${i}].admin.password`)
      if (orig.teams.length !== pg.teams.length) errors.push(`project[${i}].teams.length: ${pg.teams.length} !== ${orig.teams.length}`)

      for (let j = 0; j < Math.min(orig.teams.length, pg.teams.length); j++) {
        const ot = orig.teams[j]
        const pt = pg.teams[j]
        const p = `project[${i}].teams[${j}]`
        if (ot.id !== pt.id) errors.push(`${p}.id: "${pt.id}" !== "${ot.id}"`)
        if (ot.project !== pt.project) errors.push(`${p}.project: "${pt.project}" !== "${ot.project}"`)
        if (ot.leader !== pt.leader) errors.push(`${p}.leader: "${pt.leader}" !== "${ot.leader}"`)
        if (ot.description !== pt.description) errors.push(`${p}.description mismatch`)
        if (ot.username !== pt.username) errors.push(`${p}.username: "${pt.username}" !== "${ot.username}"`)
        if (ot.password !== pt.password) errors.push(`${p}.password: "${pt.password}" !== "${ot.password}"`)
        if (JSON.stringify(ot.members) !== JSON.stringify(pt.members)) errors.push(`${p}.members: ${JSON.stringify(pt.members)} !== ${JSON.stringify(ot.members)}`)
        for (const key of Object.keys(ot.progress)) {
          if (ot.progress[key] !== pt.progress[key]) errors.push(`${p}.progress.${key}: ${pt.progress[key]} !== ${ot.progress[key]}`)
        }
      }
    }
    if (errors.length > 0) throw new Error(errors.join('\n    '))
  })

  await test('PUT non-array body returns 400', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ not: 'array' }),
    })
    assert(r.status === 400, `expected 400, got ${r.status}`)
  })

  await test('GET after rejected PUT preserves original data (transaction safety)', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects')
    const data = JSON.parse(r.body)
    assert(data.length === 2, `expected 2 projects, got ${data.length}`)
    assert(data[0].teams.length === 4, `web project still has ${data[0].teams.length} teams`)
  })

  await test('DELETE /data/projects clears all data', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects', { method: 'DELETE' })
    assert(r.status === 200, `status ${r.status}: ${r.body}`)
  })

  await test('GET after DELETE returns empty array', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects')
    const data = JSON.parse(r.body)
    assert(Array.isArray(data) && data.length === 0, `expected empty array`)
  })

  await test('GET /data/nonexistent returns 404', async () => {
    const r = await httpRequest('http://localhost:3000/data/nonexistent')
    assert(r.status === 404, `expected 404, got ${r.status}`)
  })

  await test('PUT /data/nonexistent returns 400', async () => {
    const r = await httpRequest('http://localhost:3000/data/nonexistent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('test'),
    })
    assert(r.status === 400, `expected 400, got ${r.status}`)
  })

  // === TEAM MEMBERS ===

  await test('Team members stored and retrieved in correct order', async () => {
    await httpRequest('http://localhost:3000/data/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seedData),
    })
    const r = await httpRequest('http://localhost:3000/data/projects')
    const data = JSON.parse(r.body)
    const t2 = data[0].teams.find(t => t.id === 't2')
    assert(t2.members.length === 3, `t2 expected 3 members, got ${t2.members.length}`)
    assert(t2.members[0] === 'Aaradhya Saxena', `member 0: ${t2.members[0]}`)
    assert(t2.members[1] === 'Abhishek Saxena', `member 1: ${t2.members[1]}`)
    assert(t2.members[2] === 'Ajad Babu', `member 2: ${t2.members[2]}`)
  })

  // === PROGRESS FIELDS ===

  await test('Progress fields stored correctly (true/false)', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects')
    const data = JSON.parse(r.body)
    const t1 = data[0].teams.find(t => t.id === 't1')
    const t2 = data[0].teams.find(t => t.id === 't2')
    assert(t1.progress.documentation === false, 't1.progress.documentation should be false')
    assert(t1.progress.erd === false, 't1.progress.erd should be false')
    assert(Object.keys(t1.progress).length === 6, `t1 expected 6 progress keys, got ${Object.keys(t1.progress).length}`)
    assert(t2.progress.documentation === true, 't2.progress.documentation should be true')
    assert(t2.progress.erd === false, 't2.progress.erd should be false')
  })

  // === ORDERING ===

  await test('Projects returned in insert_order (web before ml)', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects')
    const data = JSON.parse(r.body)
    assert(data[0].id === 'web', `first project is "${data[0].id}", expected "web"`)
    assert(data[1].id === 'ml', `second project is "${data[1].id}", expected "ml"`)
  })

  await test('Teams returned in insert_order within project', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects')
    const data = JSON.parse(r.body)
    const teamIds = data[0].teams.map(t => t.id)
    assert(JSON.stringify(teamIds) === JSON.stringify(['t1', 't2', 't3', 't4']), `team order: ${teamIds}`)
  })

  // === PASSWORD FIELDS ===

  await test('Password fields preserved exactly', async () => {
    const r = await httpRequest('http://localhost:3000/data/projects')
    const data = JSON.parse(r.body)
    assert(data[0].admin.password === 'web123', 'admin password')
    assert(data[0].teams[0].password === 'prop1234', 'team password')
    assert(data[1].admin.password === 'ml123', 'ml admin password')
    assert(data[1].teams[0].password === 'spam1234', 'ml team password')
  })

  // === PROJECT ISOLATION ===

  await test('Updating one project does not affect other projects', async () => {
    const r1 = await httpRequest('http://localhost:3000/data/projects')
    const data = JSON.parse(r1.body)
    console.log(`\n    DEBUG: ${data.length} projects`)
    for (const p of data) console.log(`    DEBUG: ${p.id} - ${p.teams.length} teams [${p.teams.map(t => t.id).join(', ')}]`)
    assert(data.length === 2, `precondition: need 2 projects, got ${data.length}`)

    // Check ml has 1 team, not 2 — if stale data, fix it
    const mlProject = data.find(p => p.id === 'ml')
    const webProject = data.find(p => p.id === 'web')
    if (!mlProject || !webProject) throw new Error(`missing projects: web=${!!webProject} ml=${!!mlProject}`)
    data[0].teams[0].progress.documentation = true
    await httpRequest('http://localhost:3000/data/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await wait(200)
    const r2 = await httpRequest('http://localhost:3000/data/projects')
    const data2 = JSON.parse(r2.body)
    assert(data2.length === 2, `expected 2 projects, got ${data2.length}`)
    assert(data2[0].teams[0].progress.documentation === true, 't1 progress not saved')
    assert(data2[1].teams[0].progress.documentation === false, 'ml t5 progress was changed')
    assert(data2[1].teams.length === 2, `ml has ${data2[1].teams.length} teams, expected 2`)
  })

  console.log(`\n\nResults: ${pass} passed, ${fail} failed out of ${pass + fail} tests`)
  server.kill()
  process.exit(fail > 0 ? 1 : 0)
}

run().catch(err => { console.error('Test runner error:', err); process.exit(1) })
