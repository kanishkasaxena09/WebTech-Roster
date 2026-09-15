import { PROGRESS_ITEMS, emptyProgress, AVATAR_COLORS } from './seed'

export const TASK_STATUSES = [
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
]

export const TASK_PRIORITIES = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
]

export const PROGRESS_STATUSES = [
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
]

export const norm = s => (s || '').trim().toLowerCase()

export const initials = name =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

export function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return h
}

export const colorFor = id => AVATAR_COLORS[Math.abs(hashCode(id)) % AVATAR_COLORS.length]

export const teamSize = t => 1 + t.members.length

export const slugify = s =>
  (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'team'

export const randomPass = () =>
  Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4)

export function progressPct(t) {
  const vals = PROGRESS_ITEMS.map(i => !!(t.progress && t.progress[i.key]))
  return Math.round((vals.filter(Boolean).length / PROGRESS_ITEMS.length) * 100)
}

export function matchesSearch(t, q) {
  const qn = norm(q)
  if (!qn) return true
  return (
    norm(t.project).includes(qn) ||
    norm(t.leader).includes(qn) ||
    norm(t.description).includes(qn) ||
    t.members.some(m => norm(m).includes(qn))
  )
}

export function dedupeMembers(leader, raw) {
  const seen = new Set()
  return (raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(m => {
      const k = norm(m)
      if (k === norm(leader)) return false
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
}

export const taskStatusLabel = key =>
  (TASK_STATUSES.find(s => s.key === key) || TASK_STATUSES[0]).label

export const taskPriorityLabel = key =>
  (TASK_PRIORITIES.find(p => p.key === key) || TASK_PRIORITIES[1]).label

export function newTask(patch = {}) {
  return backfillTask({
    id: 'task' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: '',
    deadline: '',
    progress: 0,
    createdAt: Date.now(),
    ...patch,
  })
}

export function backfillTask(task) {
  const t = { ...task }
  if (!t.id) t.id = 'task' + Math.random().toString(36).slice(2, 9)
  if (typeof t.title !== 'string' || !t.title.trim()) t.title = 'Untitled task'
  if (typeof t.description !== 'string') t.description = ''
  if (!TASK_STATUSES.some(s => s.key === t.status)) t.status = 'todo'
  if (!TASK_PRIORITIES.some(p => p.key === t.priority)) t.priority = 'medium'
  if (typeof t.assignedTo !== 'string') t.assignedTo = ''
  if (typeof t.deadline !== 'string') t.deadline = ''
  const p = Number(t.progress)
  t.progress = Number.isFinite(p)
    ? Math.max(0, Math.min(100, Math.round(p)))
    : (t.status === 'done' ? 100 : 0)
  if (!t.createdAt) t.createdAt = Date.now()
  return t
}

export function taskStats(teams) {
  const list = (Array.isArray(teams) ? teams : [teams]).filter(Boolean)
  let total = 0
  let done = 0
  for (const team of list) {
    for (const task of (team.tasks || [])) {
      total += 1
      if (task.status === 'done') done += 1
    }
  }
  return { total, done, active: total - done }
}

export function teamProgressPct(team) {
  const tasks = team.tasks || []
  if (tasks.length) {
    const sum = tasks.reduce((acc, t) => acc + (Number(t.progress) || 0), 0)
    return Math.round(sum / tasks.length)
  }
  return progressPct(team)
}

export function projectProgressPct(teams) {
  const list = Array.isArray(teams) ? teams : []
  if (!list.length) return 0
  const sum = list.reduce((acc, t) => acc + teamProgressPct(t), 0)
  return Math.round(sum / list.length)
}

export function memberNames(team) {
  return [team.leader, ...(team.members || [])].filter(Boolean)
}

export function backfillAdmin(raw) {
  if (!raw || typeof raw !== 'object') return null
  const mainRaw = raw.main && typeof raw.main === 'object' ? raw.main : null
  if (!mainRaw) return null
  const a = { ...mainRaw }
  if (typeof a.username !== 'string' || !a.username.trim()) return null
  if (typeof a.password !== 'string') a.password = ''
  if (typeof a.enabled !== 'boolean') a.enabled = true
  if (typeof a.name !== 'string' || !a.name.trim()) a.name = a.username.trim()
  if (!a.createdAt) a.createdAt = Date.now()
  return { main: a }
}

export function normalizeAdmins(raw) {
  return backfillAdmin(raw)
}

export function backfillTeam(team) {
  const t = { ...team }
  if (typeof t.description !== 'string') t.description = ''
  if (!Array.isArray(t.members)) t.members = []
  if (!t.progress || typeof t.progress !== 'object') t.progress = emptyProgress()
  else t.progress = { ...emptyProgress(), ...t.progress }
  if (!t.username) t.username = slugify(t.project)
  if (!t.password) t.password = randomPass()
  if (typeof t.enabled !== 'boolean') t.enabled = true
  t.tasks = Array.isArray(t.tasks) ? t.tasks.map(backfillTask) : []
  if (!t.createdAt) t.createdAt = Date.now()
  return t
}

export function backfillProject(p, index = 0) {
  const proj = { ...p }
  if (!proj.id) proj.id = 'p' + (index + 1)
  if (!proj.name) proj.name = proj.id
  proj.admin = proj.admin && typeof proj.admin === 'object'
    ? { username: proj.admin.username || 'admin', password: proj.admin.password || 'admin123' }
    : { username: 'admin', password: 'admin123' }
  if (typeof proj.description !== 'string') proj.description = ''
  proj.status = proj.status === 'archived' ? 'archived' : 'active'
  if (!proj.createdAt) proj.createdAt = Date.now()
  proj.teams = Array.isArray(proj.teams)
    ? proj.teams.map(backfillTeam)
    : []
  return proj
}

export function normalizeProjects(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(backfillProject).filter(p => p.id && p.name)
}

export function cleanImported(rawArray) {
  return rawArray
    .map((t, i) => backfillTeam({
      id: t.id || ('t' + Date.now() + i),
      project: String(t.project || '').trim(),
      description: String(t.description || '').trim(),
      leader: String(t.leader || '').trim(),
      members: Array.isArray(t.members) ? t.members.map(m => String(m).trim()).filter(Boolean) : [],
      username: t.username || undefined,
      password: t.password || undefined,
      progress: t.progress,
      enabled: t.enabled,
      tasks: Array.isArray(t.tasks) ? t.tasks.map(backfillTask) : [],
    }))
    .filter(t => t.project && t.leader)
}