import https from 'node:https'
import fs from 'node:fs'

function fetch(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'https://webtech-roster.onrender.com')
    const reqOpts = { hostname: url.hostname, port: 443, path: url.pathname, method: opts.method || 'GET', headers: opts.headers || {}, timeout: 30000 }
    const req = https.request(reqOpts, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

const r = await fetch('/data/projects')
const apiData = JSON.parse(r.body)
const prodData = JSON.parse(fs.readFileSync('production-projects.json', 'utf8'))

// Deep comparison: find first difference
function findDiff(a, b, path = '') {
  if (typeof a !== typeof b) return `${path}: type ${typeof a} vs ${typeof b}`
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array mismatch`
  if (typeof a !== 'object' || a === null || b === null) {
    if (a !== b) return `${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`
    return null
  }
  const keysA = Object.keys(a).sort()
  const keysB = Object.keys(b).sort()
  if (JSON.stringify(keysA) !== JSON.stringify(keysB)) return `${path}: keys ${keysA} vs ${keysB}`
  for (const k of keysA) {
    const d = findDiff(a[k], b[k], `${path}.${k}`)
    if (d) return d
  }
  return null
}

const diff = findDiff(apiData, prodData)
if (diff) {
  console.log('First difference found:')
  console.log(diff)
  
  // Also try normalized comparison (ignore key order in objects)
  const apiNorm = JSON.parse(JSON.stringify(apiData))
  const prodNorm = JSON.parse(JSON.stringify(prodData))
  
  // Sort team members and progress keys for comparison
  function normalize(obj) {
    if (Array.isArray(obj)) return obj.map(normalize)
    if (typeof obj === 'object' && obj !== null) {
      const sorted = {}
      for (const k of Object.keys(obj).sort()) {
        sorted[k] = normalize(obj[k])
      }
      return sorted
    }
    return obj
  }
  
  const apiS = JSON.stringify(normalize(apiNorm))
  const prodS = JSON.stringify(normalize(prodNorm))
  console.log('Normalized match:', apiS === prodS)
  
  if (apiS !== prodS) {
    // Find diff in normalized
    const normDiff = findDiff(normalize(apiNorm), normalize(prodNorm))
    console.log('Normalized diff:', normDiff)
  }
} else {
  console.log('EXACT MATCH - no differences found')
}

// Also show character-level diff positions
const apiStr = JSON.stringify(apiData)
const prodStr = JSON.stringify(prodData)
console.log(`\nAPI response length: ${apiStr.length}`)
console.log(`Production length: ${prodStr.length}`)

// Find first character diff
for (let i = 0; i < Math.max(apiStr.length, prodStr.length); i++) {
  if (apiStr[i] !== prodStr[i]) {
    console.log(`\nFirst char diff at position ${i}:`)
    console.log(`  API: ...${apiStr.substring(Math.max(0, i-30), i+30)}...`)
    console.log(`  Prod: ...${prodStr.substring(Math.max(0, i-30), i+30)}...`)
    break
  }
}
