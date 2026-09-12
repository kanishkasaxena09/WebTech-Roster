import { PROGRESS_ITEMS, emptyProgress, AVATAR_COLORS } from './seed'

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

export function backfillTeam(team) {
  const t = { ...team }
  if (typeof t.description !== 'string') t.description = ''
  if (!Array.isArray(t.members)) t.members = []
  if (!t.progress || typeof t.progress !== 'object') t.progress = emptyProgress()
  else t.progress = { ...emptyProgress(), ...t.progress }
  if (!t.username) t.username = slugify(t.project)
  if (!t.password) t.password = randomPass()
  return t
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
    }))
    .filter(t => t.project && t.leader)
}