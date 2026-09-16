import http from 'node:http'
import { spawn } from 'node:child_process'
import fs from 'node:fs'

function httpRequest(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    http.get({ hostname: u.hostname, port: u.port, path: u.pathname }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    }).on('error', reject)
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

async function main() {
  const server = await startServer()
  await wait(500)

  try {
    const res = await httpRequest('http://localhost:3000/data/projects')
    if (res.status !== 200) {
      console.error(`FAIL: GET returned ${res.status}`)
      process.exit(1)
    }

    const apiData = JSON.parse(res.body)
    const prodRaw = fs.readFileSync('production-projects.json', 'utf8')
    const prodData = JSON.parse(prodRaw)

    // Compare project count
    if (apiData.length !== prodData.length) {
      console.error(`FAIL: Project count mismatch — API=${apiData.length}, production=${prodData.length}`)
      process.exit(1)
    }
    console.log(`Projects: ${apiData.length} (matches production)`)

    let allMatch = true
    for (let i = 0; i < prodData.length; i++) {
      const p = prodData[i]
      const a = apiData.find(x => x.id === p.id)
      if (!a) {
        console.error(`FAIL: Project "${p.id}" not found in API response`)
        allMatch = false
        continue
      }

      // Compare scalar fields
      const fields = ['name']
      for (const f of fields) {
        if (p[f] !== a[f]) {
          console.error(`FAIL: ${p.id}.${f}: API="${a[f]}" !== production="${p[f]}"`)
          allMatch = false
        }
      }

      // Compare admin
      if (p.admin?.username !== a.admin?.username) {
        console.error(`FAIL: ${p.id}.admin.username: API="${a.admin?.username}" !== production="${p.admin?.username}"`)
        allMatch = false
      }
      if (p.admin?.password !== a.admin?.password) {
        console.error(`FAIL: ${p.id}.admin.password mismatch`)
        allMatch = false
      }

      // Compare teams count
      if (p.teams.length !== a.teams.length) {
        console.error(`FAIL: ${p.id} team count: API=${a.teams.length} !== production=${p.teams.length}`)
        allMatch = false
        continue
      }

      // Compare each team
      for (let ti = 0; ti < p.teams.length; ti++) {
        const pt = p.teams[ti]
        const at = a.teams.find(t => t.id === pt.id)
        if (!at) {
          console.error(`FAIL: ${p.id} team "${pt.id}" not found in API`)
          allMatch = false
          continue
        }

        const teamFields = ['project', 'leader', 'description', 'username', 'password']
        for (const f of teamFields) {
          if (pt[f] !== at[f]) {
            console.error(`FAIL: ${p.id}.${pt.id}.${f}: API="${at[f]}" !== production="${pt[f]}"`)
            allMatch = false
          }
        }

        // Members
        const prodMembers = JSON.stringify(pt.members || [])
        const apiMembers = JSON.stringify(at.members || [])
        if (prodMembers !== apiMembers) {
          console.error(`FAIL: ${p.id}.${pt.id}.members mismatch`)
          allMatch = false
        }

        // Progress
        for (const key of Object.keys(pt.progress || {})) {
          if (pt.progress[key] !== (at.progress || {})[key]) {
            console.error(`FAIL: ${p.id}.${pt.id}.progress.${key}: API=${at.progress?.[key]} !== production=${pt.progress[key]}`)
            allMatch = false
          }
        }
      }

      console.log(`  ${p.id}: ${p.teams.length} teams — ${allMatch ? 'ALL MATCH' : 'MISMATCHES FOUND'}`)
    }

    if (allMatch) {
      console.log('\nPASS: API response matches production-projects.json exactly.')
    } else {
      console.error('\nFAIL: Mismatches detected.')
      process.exit(1)
    }
  } finally {
    server.kill()
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1) })
