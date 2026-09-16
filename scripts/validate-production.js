import fs from 'node:fs'

const file = 'production-projects.json'

if (!fs.existsSync(file)) {
  console.error('FAIL: File does not exist.')
  process.exit(1)
}
console.log('1. File exists: YES')

let raw
try {
  raw = fs.readFileSync(file, 'utf8')
} catch (err) {
  console.error(`FAIL: Cannot read file: ${err.message}`)
  process.exit(1)
}

let data
try {
  data = JSON.parse(raw)
} catch (err) {
  console.error(`FAIL: Not valid JSON: ${err.message}`)
  process.exit(1)
}
console.log('2. Valid JSON: YES')

if (!Array.isArray(data)) {
  console.error(`FAIL: Top-level type is ${typeof data}, expected array.`)
  process.exit(1)
}
console.log(`3. Top-level is array: YES (${data.length} elements)`)

if (data.length === 0) {
  console.error('FAIL: Empty dataset. Refusing to validate empty import.')
  process.exit(1)
}
console.log('4. Non-empty: YES')

const web = data.find(p => p.id === 'web')
const ml = data.find(p => p.id === 'ml')
console.log(`5. Web project exists: ${web ? 'YES' : 'NO'}`)
console.log(`6. ML project exists: ${ml ? 'YES' : 'NO'}`)

if (!web || !ml) {
  console.error('FAIL: Missing expected projects.')
  process.exit(1)
}

console.log('\n=== STRUCTURAL INFO (no passwords/tokens) ===')

for (const p of data) {
  console.log(`\nProject: "${p.name}" (id="${p.id}")`)
  console.log(`  Admin username: ${p.admin?.username || 'N/A'}`)
  console.log(`  Teams: ${p.teams?.length || 0}`)
  for (const t of (p.teams || [])) {
    console.log(`    [${t.id}] "${t.project}" — leader: ${t.leader}`)
    console.log(`      Members: ${JSON.stringify(t.members)}`)
    const progressKeys = Object.keys(t.progress || {})
    const completed = progressKeys.filter(k => t.progress[k])
    console.log(`      Progress: ${completed.length}/${progressKeys.length} completed`)
  }
}

console.log('\n=== COUNTS ===')
const totalTeams = data.reduce((sum, p) => sum + (p.teams?.length || 0), 0)
const totalMembers = data.reduce((sum, p) => sum + (p.teams || []).reduce((s, t) => s + (t.members?.length || 0), 0), 0)
console.log(`Projects: ${data.length}`)
console.log(`Teams: ${totalTeams}`)
console.log(`Members: ${totalMembers}`)

console.log('\n=== VALIDATION CHECKS ===')
console.log(`Web teams: ${web.teams.length} (expected 4): ${web.teams.length === 4 ? 'PASS' : 'FAIL'}`)
console.log(`ML teams: ${ml.teams.length} (expected 2): ${ml.teams.length === 2 ? 'PASS' : 'FAIL'}`)

const webTeamIds = web.teams.map(t => t.id).sort()
const mlTeamIds = ml.teams.map(t => t.id).sort()
console.log(`Web team IDs: [${webTeamIds.join(', ')}] ${JSON.stringify(webTeamIds) === JSON.stringify(['t1','t2','t3','t4']) ? 'PASS' : 'CHECK'}`)
console.log(`ML team IDs: [${mlTeamIds.join(', ')}] ${JSON.stringify(mlTeamIds) === JSON.stringify(['t5','t6']) ? 'PASS' : 'CHECK'}`)

const webTeamNames = web.teams.map(t => t.project)
const mlTeamNames = ml.teams.map(t => t.project)
console.log(`Web team names: [${webTeamNames.join(', ')}]`)
console.log(`ML team names: [${mlTeamNames.join(', ')}]`)

console.log('\nDone.')
