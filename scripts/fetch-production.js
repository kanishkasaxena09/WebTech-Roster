import https from 'node:https'
import fs from 'node:fs'

const url = 'https://webtech-roster.onrender.com/data/projects'

function fetch(u) {
  return new Promise((resolve, reject) => {
    https.get(u, { timeout: 30000 }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    }).on('error', reject)
  })
}

const res = await fetch(url)
console.log(`HTTP ${res.status}, ${res.body.length} bytes`)

if (res.status !== 200) {
  console.error('Non-200 status. Aborting.')
  process.exit(1)
}

fs.writeFileSync('production-projects.json', res.body, 'utf8')
console.log('Saved to production-projects.json')
