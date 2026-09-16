import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
})

const client = await pool.connect()
try {
  console.log('=== PROJECTS ===')
  const { rows: projects } = await client.query('SELECT id, name, admin_username, insert_order FROM projects ORDER BY insert_order')
  for (const p of projects) {
    console.log(`  [${p.insert_order}] id="${p.id}" name="${p.name}" admin="${p.admin_username}"`)
  }
  console.log(`  Total: ${projects.length}`)

  console.log('\n=== TEAMS ===')
  const { rows: teams } = await client.query('SELECT id, project_id, project_name, leader, username, insert_order FROM teams ORDER BY insert_order')
  for (const t of teams) {
    console.log(`  [${t.insert_order}] id="${t.id}" project_id="${t.project_id}" project_name="${t.project_name}" leader="${t.leader}" username="${t.username}"`)
  }
  console.log(`  Total: ${teams.length}`)

  console.log('\n=== TEAM_MEMBERS ===')
  const { rows: members } = await client.query('SELECT tm.id, tm.team_id, tm.member_name, tm.sort_order FROM team_members tm ORDER BY tm.team_id, tm.sort_order')
  for (const m of members) {
    console.log(`  team_id="${m.team_id}" [${m.sort_order}] member="${m.member_name}"`)
  }
  console.log(`  Total: ${members.length}`)

  console.log('\n=== TEAM_PROGRESS ===')
  const { rows: progress } = await client.query('SELECT team_id, progress_key, completed FROM team_progress ORDER BY team_id, progress_key')
  for (const p of progress) {
    console.log(`  team_id="${p.team_id}" key="${p.progress_key}" completed=${p.completed}`)
  }
  console.log(`  Total: ${progress.length}`)

  console.log('\n=== ML PROJECT SPECIFIC ===')
  const mlProject = projects.find(p => p.id === 'ml')
  if (mlProject) {
    console.log(`ML Project: id="${mlProject.id}" name="${mlProject.name}"`)
    const mlTeams = teams.filter(t => t.project_id === 'ml')
    console.log(`Teams with project_id="ml": ${mlTeams.length}`)
    for (const t of mlTeams) {
      console.log(`  id="${t.id}" project_name="${t.project_name}" username="${t.username}" insert_order=${t.insert_order}`)
    }
    // Check for teams that might reference ml by name
    const mlByName = teams.filter(t => t.project_name.includes('ML') || t.project_name.includes('Spam') || t.project_name.includes('Image'))
    console.log(`Teams matching ML/Spam/Image by name: ${mlByName.length}`)
    for (const t of mlByName) {
      console.log(`  id="${t.id}" project_id="${t.project_id}" project_name="${t.project_name}"`)
    }
  } else {
    console.log('ML project NOT FOUND')
  }

  console.log('\n=== ROW COUNTS ===')
  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM teams) AS teams,
      (SELECT COUNT(*) FROM team_members) AS members,
      (SELECT COUNT(*) FROM team_progress) AS progress
  `)
  console.log(`  projects: ${counts.rows[0].projects}`)
  console.log(`  teams: ${counts.rows[0].teams}`)
  console.log(`  members: ${counts.rows[0].members}`)
  console.log(`  progress: ${counts.rows[0].progress}`)

} finally {
  client.release()
  await pool.end()
}
