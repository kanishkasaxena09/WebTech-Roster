import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../store'
import { Logo } from '../components/Login'
import SyncNote from '../components/SyncNote'
import { PROGRESS_ITEMS } from '../seed'
import {
  taskStats, projectProgressPct, progressPct, colorFor, initials, teamSize,
  memberNames, randomPass, norm, dedupeMembers, slugify, TASK_STATUSES, TASK_PRIORITIES,
} from '../utils'

const VALID_VIEWS = ['overview', 'projects', 'admins', 'teams', 'members', 'tasks', 'progress', 'settings']
const DEFAULT_VIEW = 'overview'

const PROJECT_LABELS = { web: 'Web Tech', ml: 'Mini Project' }
const projectTitle = (p) => (p ? (PROJECT_LABELS[p.id] || p.name) : '')

const icons = {
  overview: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
  projects: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 4v16" /></svg>,
  admins: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="11" r="2.5" /><path d="M8 17c.5-1.8 2-3 4-3s3.5 1.2 4 3" /></svg>,
  teams: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  members: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M21 12a9 9 0 1 0-3-6.7M21 3v6h-6" /></svg>,
  tasks: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  progress: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6 3" /></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.7.2 1.3.62 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04z" /></svg>,
}

const labels = {
  overview: 'Overview', projects: 'Projects', admins: 'Project Admins', teams: 'Teams',
  members: 'Members', tasks: 'Tasks', progress: 'Progress', settings: 'Settings',
}

const navGroups = [
  { label: 'Overview', items: ['overview'] },
  { label: 'Manage', items: ['projects', 'admins', 'teams', 'members', 'tasks', 'progress'] },
  { label: 'Workstation', items: ['settings'] },
]

function greeting() {
  const hr = new Date().getHours()
  if (hr < 12) return 'Good morning'
  if (hr < 18) return 'Good afternoon'
  return 'Good evening'
}

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>
}

// ──────────────────────────────────────────────────────────────── Overview
function Overview({ projects, onGoView, onOpenTeam, onEditProject }) {
  const allTeams = projects.flatMap(p => p.teams)
  const allTasks = allTeams.flatMap(t => t.tasks || [])
  const members = allTeams.reduce((s, t) => s + memberNames(t).length, 0)
  const overall = projectProgressPct(allTeams)

  const statCards = [
    { l: 'Total Projects', v: projects.length, sub: 'Web Tech · Mini Project' },
    { l: 'Project Admins', v: projects.length, sub: 'one per website' },
    { l: 'Total Teams', v: allTeams.length, sub: 'across both projects' },
    { l: 'Total Tasks', v: allTasks.length, sub: `${taskStats(allTeams).done} completed` },
    { l: 'Overall Progress', v: overall + '%', sub: 'across every team' },
  ]

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>{greeting()}, Admin</h1>
          <div className="page-sub">Here's what's happening across WebTech Roster.</div>
        </div>
        <div className="head-actions">
          <span className="status-badge active">System Online</span>
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map(s => (
          <div key={s.l} className="stat-card">
            <div className="l">{s.l}</div>
            <div className="n">{s.v}</div>
            <div className="sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <h3 className="group-label">Project overview</h3>
      <div className="ma-overview-grid">
        {projects.map(p => (
          <div key={p.id} className="card">
            <div className="card-title" style={{ marginBottom: 8 }}>
              <div className="t">{projectTitle(p)}</div>
              <span className={`status-badge ${p.status === 'archived' ? 'archived' : 'active'}`}>
                {p.status === 'archived' ? 'Archived' : 'Active'}
              </span>
            </div>
            <div className="ma-tree">
              <div className="tree-row type-project" onClick={() => onEditProject(p.id)}>
                <span className="tree-leaf">▾</span>
                <span className="tree-icon" style={{ background: 'linear-gradient(135deg,#F0299B,#8B5CF6)' }}>{projectTitle(p)[0]}</span>
                <span className="tree-label">{(p.admin && p.admin.username) || 'admin'}</span>
                <span className="tree-meta">{p.teams.length} team(s)</span>
              </div>
              <div className="tree-row type-admin">
                <span className="tree-leaf">·</span>
                <span className="tree-avatar" style={{ background: 'var(--violet)' }}>
                  {projectTitle(p).slice(0, 1)}
                </span>
                <span className="tree-label">{projectTitle(p)} Admin</span>
                <span className="tree-leaf" style={{ color: 'var(--green)' }}>●</span>
              </div>
              {p.teams.map(t => {
                const pct = progressPct(t)
                return (
                  <div key={t.id} className="tree-row type-team" onClick={() => onOpenTeam(p.id, t.id)}>
                    <span className="tree-chevron">▸</span>
                    <span className="tree-avatar" style={{ background: colorFor(t.id) }}>{initials(t.leader)}</span>
                    <span className="tree-label">{t.project}</span>
                    <span className="tree-bar" style={{ width: 46 }}>
                      <div className="fill" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="tree-meta">{pct}%</span>
                  </div>
                )
              })}
              {p.teams.length === 0 && <div className="tree-row empty-row">No teams in this project yet.</div>}
            </div>
            <div className="proj-head-actions" style={{ marginTop: 10, flexDirection: 'row' }}>
              <button className="pill-btn" onClick={() => onGoView('projects', p.id)}>Manage</button>
              <button className="pill-btn" onClick={() => onGoView('tasks', p.id)}>Tasks</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────── Projects
function Projects({ projects, onEditProject, onToggleArchive, onGoView }) {
  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <div className="page-sub">Everything beneath both websites — teams, tasks and admins</div>
        </div>
      </div>
      <div className="ma-proj-grid">
        {projects.map(p => {
          const pct = projectProgressPct(p.teams)
          const tasks = taskStats(p.teams)
          return (
            <div key={p.id} className="card proj-head" style={{ gridTemplateColumns: '1fr auto', flexDirection: 'column' }}>
              <div className="proj-head-main" style={{ width: '100%' }}>
                <div className="proj-head-name">
                  <span className={`status-badge ${p.status === 'archived' ? 'archived' : 'active'}`}>
                    {p.status === 'archived' ? 'Archived' : 'Active'}
                  </span>
                  <h2>{projectTitle(p)}</h2>
                </div>
                <div className="proj-head-desc">{p.description || 'No description yet.'}</div>
                <div className="proj-head-meta">
                  <span>Admin: <b>{(p.admin && p.admin.username) || '—'}</b></span>·
                  <span>{p.teams.length} team(s)</span>·
                  <span>{tasks.total} task(s)</span>·
                  <span>{p.teams.reduce((s, t) => s + teamSize(t), 0)} member(s)</span>
                </div>
              </div>
              <div className="proj-head-side">
                <div className="proj-head-pct">{pct}%</div>
                <div className="bar-line"><div className="fill" style={{ width: `${pct}%` }} /></div>
              </div>
              <div className="proj-head-actions" style={{ width: '100%' }}>
                <button className="pill-btn" onClick={() => onEditProject(p.id)}>Edit</button>
                <button className="pill-btn" onClick={() => onGoView('teams', p.id)}>Manage Teams</button>
                <button className="pill-btn" onClick={() => onGoView('tasks', p.id)}>Tasks</button>
                {p.status === 'archived'
                  ? <button className="pill-btn" onClick={() => onToggleArchive(p, false)}>Unarchive</button>
                  : <button className="pill-btn" onClick={() => onToggleArchive(p, true)}>Archive</button>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────── Admins
function Admins({ projects, onEditAdmin, onResetAdmin, onToggleAdmin }) {
  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Project Admins</h1>
          <div className="page-sub">Manage the credentials for each website's admin</div>
        </div>
      </div>
      <div className="ma-proj-grid">
        {projects.map(p => {
          const a = p.admin || {}
          const on = a.enabled !== false
          return (
            <div key={p.id} className="card">
              <div className="card-title">
                <div className="t">{projectTitle(p)} Admin</div>
                <span className={`status-badge ${on ? 'active' : 'archived'}`}>{on ? 'Active' : 'Disabled'}</span>
              </div>
              <div className="setting-row">
                <div className="l"><div className="t2">Username</div><div className="d">Login for the website admin</div></div>
                <code>{a.username}</code>
              </div>
              <div className="setting-row">
                <div className="l"><div className="t2">Project</div><div className="d">Scoped website</div></div>
                <div>{projectTitle(p)}</div>
              </div>
              <div className="setting-row" style={{ borderBottom: 'none' }}>
                <div className="l"><div className="t2">Status</div><div className="d">Disabled admins cannot sign in</div></div>
                <button className={`mini-btn${on ? ' danger' : ''}`} onClick={() => onToggleAdmin(p)}>
                  {on ? 'Disable' : 'Enable'}
                </button>
              </div>
              <div className="proj-actions" style={{ marginTop: 12 }}>
                <button className="icon-btn-lg" onClick={() => onEditAdmin(p)}>Edit</button>
                <button className="icon-btn-lg" onClick={() => onResetAdmin(p)}>Reset Password</button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────── Teams
function Teams({ projects, search, onAdd, onEdit, onDelete, onToggle, onOpen, onGoTasks }) {
  const allTeams = projects.flatMap(p => p.teams.map(t => ({ ...t, projectId: p.id })))
  const q = norm(search)
  const visible = allTeams.filter(t => !q || norm(t.project).includes(q) || norm(t.leader).includes(q) || norm(t.description).includes(q))

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Teams</h1>
          <div className="page-sub">Every team login across Web Tech and Mini Project</div>
        </div>
        <div className="head-actions">
          <button className="btn-primary" onClick={() => onAdd(projects[0] ? projects[0].id : null)}>+ Add team</button>
        </div>
      </div>

      {projects.map(p => {
        const rows = visible.filter(t => t.projectId === p.id)
        return (
          <div key={p.id}>
            <h3 className="group-label">{projectTitle(p)}</h3>
            {rows.length === 0 && <div className="empty">No teams{search ? ' matching your search' : ''} in {projectTitle(p)}.</div>}
            <div className="proj-grid">
              {rows.map(t => {
                const pct = progressPct(t)
                const on = t.enabled !== false
                return (
                  <div key={t.id} className="proj-card">
                    <div className="proj-card-click" onClick={() => onOpen(p.id, t.id)}>
                      <div className="proj-card-head">
                        <div className="name">{t.project}{!on && <span className="enabled-badge" style={{ marginLeft: 6 }}>Disabled</span>}</div>
                        <div className="proj-badge">{teamSize(t)} members</div>
                      </div>
                      {t.description && <div className="proj-desc">{t.description}</div>}
                      <div className="proj-leader">Led by <b>{t.leader}</b></div>
                      <div className="proj-chips">
                        {t.members.map(m => <span key={m} className="chip">{m}</span>)}
                      </div>
                      <div className="mini-progress">
                        <div className="bar-line"><div className="fill" style={{ width: `${pct}%` }} /></div>
                        <span className="pct">{pct}%</span>
                      </div>
                    </div>
                    <div className="proj-actions">
                      <button className="icon-btn-lg" onClick={() => onEdit(p.id, t.id)}>Edit</button>
                      <button className={`icon-btn-lg${on ? '' : ' danger'}`} onClick={() => onToggle(p.id, t.id)}>
                        {on ? 'Disable' : 'Enable'}
                      </button>
                      <button className="icon-btn-lg" onClick={() => onGoTasks(p.id, t.id)}>Tasks</button>
                      <button className="icon-btn-lg danger" onClick={() => onDelete(p.id, t)}>Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────── Members
function Members({ projects, search, onEditTeam }) {
  const q = norm(search)
  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Members</h1>
          <div className="page-sub">Every student on the roster, leaders and teammates</div>
        </div>
      </div>
      {projects.map(p => (
        <div key={p.id}>
          <h3 className="group-label">{projectTitle(p)}</h3>
          {p.teams.length === 0 && <div className="empty">No teams in this project yet.</div>}
          {p.teams.map(t => {
            const people = memberNames(t)
            const vis = people.filter(n => !q || norm(n).includes(q))
            if (!vis.length) return null
            return (
              <div key={t.id} className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">
                  <div className="t">
                    <span className="t-avatar" style={{ background: colorFor(t.id), width: 26, height: 26, fontSize: 10 }}>{initials(t.leader)}</span>
                    &nbsp;{t.project}
                    {t.enabled === false && <span className="enabled-badge" style={{ marginLeft: 6 }}>Disabled</span>}
                  </div>
                  <button className="mini-btn" onClick={() => onEditTeam(p.id, t.id)}>Edit team</button>
                </div>
                <div className="member-row">
                  <div className="t-avatar" style={{ background: colorFor(t.id), width: 32, height: 32, fontSize: 11 }}>{initials(t.leader)}</div>
                  <div className="m-name">{t.leader}</div>
                  <span className="role-pill leader">Leader</span>
                  <div className="m-proj">{t.project}</div>
                </div>
                {t.members.map(m => {
                  if (q && !norm(m).includes(q)) return null
                  return (
                    <div key={m} className="member-row">
                      <div className="t-avatar" style={{ background: 'var(--panel-alt)', color: 'var(--muted)', width: 32, height: 32, fontSize: 11 }}>{initials(m)}</div>
                      <div className="m-name">{m}</div>
                      <span className="role-pill member">Member</span>
                      <div className="m-proj">{t.project}</div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────── Tasks
function Tasks({ projects, filters, setFilters, onAdd, onEdit, onDelete, onStatusChange }) {
  const { query, project, team, status, priority } = filters

  const allTeams = useMemo(() => projects.flatMap(p => p.teams.map(t => ({ ...t, projectId: p.id }))), [projects])
  const rows = useMemo(() => allTeams.flatMap(t => (t.tasks || []).map(k => ({ ...k, projectId: t.projectId, teamId: t.id, teamId2: t.id }))), [allTeams])
  const teamOptions = allTeams.filter(t => project === 'all' || t.projectId === project)

  const visible = rows.filter(k => {
    if (project !== 'all' && k.projectId !== project) return false
    if (team !== 'all' && k.teamId !== team) return false
    if (status !== 'all' && k.status !== status) return false
    if (priority !== 'all' && k.priority !== priority) return false
    if (query && !norm(k.title).includes(norm(query)) && !norm(k.assignedTo || '').includes(norm(query))) return false
    return true
  })

  const stats = useMemo(() => ({ total: rows.length, done: rows.filter(k => k.status === 'done').length }), [rows])
  const pName = (pid) => projectTitle(projects.find(x => x.id === pid) || {})
  const tName = (pid, tid) => {
    const t = allTeams.find(x => x.projectId === pid && x.id === tid)
    return t ? t.project : ''
  }

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Tasks</h1>
          <div className="page-sub">Every task across both websites</div>
        </div>
        <div className="head-actions">
          <button className="btn-primary" onClick={() => onAdd(null, null)}>+ Add task</button>
        </div>
      </div>

      <div className="task-filters">
        <select className="task-chip" style={{ padding: '7px 10px' }} value={project} onChange={e => setFilters({ project: e.target.value, team: 'all' })}>
          <option value="all">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{projectTitle(p)}</option>)}
        </select>
        <select className="task-chip" style={{ padding: '7px 10px' }} value={team} onChange={e => setFilters({ team: e.target.value })}>
          <option value="all">All Teams</option>
          {teamOptions.map(t => <option key={t.id} value={t.id}>{t.project}{t.enabled === false ? ' · off' : ''}</option>)}
        </select>
        <select className="task-chip" style={{ padding: '7px 10px' }} value={status} onChange={e => setFilters({ status: e.target.value })}>
          <option value="all">All Status</option>
          {TASK_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className="task-chip" style={{ padding: '7px 10px' }} value={priority} onChange={e => setFilters({ priority: e.target.value })}>
          <option value="all">All Priority</option>
          {TASK_PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <input className="task-search" value={query} onChange={e => setFilters({ query: e.target.value })} placeholder="Filter tasks…" />
      </div>

      <div className="task-summary">
        <div className="task-summary-item"><b>{stats.total}</b> total</div>
        <div className="task-summary-item"><b>{stats.total - stats.done}</b> active</div>
        <div className="task-summary-item"><b>{stats.done}</b> done</div>
      </div>

      <div className="card">
        {visible.length === 0 && <div className="empty">No tasks match these filters.</div>}
        {visible.map(k => (
          <div key={k.teamId + k.id} className="task-row">
            <div className="task-main">
              <span className={`status-icon s-${k.status}`}>{k.status === 'done' ? '●' : k.status === 'in_progress' ? '◐' : '○'}</span>
              <div className="task-body">
                <div className="task-title-line">
                  <span className="task-title">{k.title}</span>
                  {k.deadline && <span className="task-deadline">due {k.deadline}</span>}
                </div>
                <div className="task-sub">
                  <span className="chip">{pName(k.projectId)}</span>
                  <span className="chip">{tName(k.projectId, k.teamId)}</span>
                  {k.assignedTo && <span className="chip">{k.assignedTo}</span>}
                  <span className={`prio-badge ${k.priority || 'medium'}`}>{k.priority || 'medium'}</span>
                  {k.description && <span className="task-desc">{k.description}</span>}
                </div>
                <div className="task-progress">
                  <div className="bar-line"><div className="fill" style={{ width: `${Number(k.progress) || 0}%` }} /></div>
                  <span className="pct">{Number(k.progress) || 0}%</span>
                </div>
              </div>
            </div>
            <div className="task-actions">
              <select className="status-select" value={k.status} onChange={e => onStatusChange(k.projectId, k.teamId, k.id, e.target.value)}>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
              <button className="mini-btn" onClick={() => onEdit(k.projectId, k.teamId, k)}>Edit</button>
              <button className="mini-btn danger" onClick={() => onDelete(k.projectId, k.teamId, k)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────── Progress
function Progress({ projects, onToggleProgress }) {
  const allTeams = projects.flatMap(p => p.teams)
  const overall = projectProgressPct(allTeams)
  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Progress</h1>
          <div className="page-sub">Progress across every team, updateable from here</div>
        </div>
        <div className="proj-head-side" style={{ minWidth: 160, textAlign: 'right' }}>
          <div className="proj-head-pct">Overall {overall}%</div>
          <div className="bar-line"><div className="fill" style={{ width: `${overall}%` }} /></div>
        </div>
      </div>

      {projects.map(p => {
        const pct = projectProgressPct(p.teams)
        return (
          <div key={p.id}>
            <div className="card" style={{ marginBottom: 10, paddingBottom: 14 }}>
              <div className="card-title"><div className="t">{projectTitle(p)}</div><div className="proj-badge">{pct}%</div></div>
              <div className="bar-line"><div className="fill" style={{ width: `${pct}%` }} /></div>
            </div>
            <div className="ma-progress-grid">
              {p.teams.map(t => {
                const tpct = progressPct(t)
                const ts = taskStats(t)
                return (
                  <div key={t.id} className="card">
                    <div className="card-title">
                      <div className="t"><span className="t-avatar" style={{ background: colorFor(t.id), width: 24, height: 24, fontSize: 10 }}>{initials(t.leader)}</span>&nbsp;{t.project}</div>
                      <div className="proj-badge">{tpct}%</div>
                    </div>
                    <div className="bar-line" style={{ marginBottom: 12 }}>
                      <div className="fill" style={{ width: `${tpct}%` }} />
                    </div>
                    <div className="progress-mini-grid">
                      {PROGRESS_ITEMS.map(i => (
                        <div key={i.key} className={`pm${t.progress[i.key] ? ' on' : ''} clickable`}
                          title="Click to toggle on behalf of this team"
                          onClick={() => onToggleProgress(p.id, t.id, i.key)}>
                          {t.progress[i.key] ? '✓ ' : ''}{i.label}
                        </div>
                      ))}
                    </div>
                    <div className="progress-mini-note">{ts.total ? `${ts.done}/${ts.total} task(s) done` : 'No tasks yet'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────── Settings
function Settings({ projects, admins, onToggleArchive, onResetAdmin, onToggleAdmin, onSetAdminPass, onUpdateMain, onToggleMain }) {
  const [pass, setPass] = useState('')
  const [newMainPass, setNewMainPass] = useState('')
  const main = admins && admins.main
  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <div className="page-sub">Website, project and account management</div>
        </div>
      </div>
      <div className="settings-grid">
        <div className="card">
          <div className="card-title"><div className="t">Website information</div></div>
          <div className="setting-row">
            <div className="l"><div className="t2">Name</div><div className="d">Brand of the roster dashboard</div></div>
            <div>{main ? 'WebTech Roster' : 'WebTech Roster'}</div>
          </div>
          <div className="setting-row" style={{ borderBottom: 'none' }}>
            <div className="l"><div className="t2">Description</div><div className="d">Classroom roster and live project dashboard</div></div>
            <div>Web Tech · Sem 5</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title"><div className="t">Project management</div></div>
          {projects.map(p => (
            <div key={p.id} className="setting-row" style={{ borderBottom: p.id === projects[projects.length - 1].id ? 'none' : '1px solid var(--border)' }}>
              <div className="l">
                <div className="t2">{projectTitle(p)}</div>
                <div className="d">{p.status === 'archived' ? 'Currently archived' : 'Currently active'}</div>
              </div>
              <button className="pill-btn" onClick={() => onToggleArchive(p, p.status !== 'archived')}>
                {p.status === 'archived' ? 'Unarchive' : 'Archive'}
              </button>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title"><div className="t">Admin management</div></div>
          {projects.map(p => (
            <div key={p.id} className="setting-row">
              <div className="l">
                <div className="t2">{projectTitle(p)} Admin</div>
                <div className="d">{(p.admin && p.admin.username) || '—'} · {p.admin && p.admin.enabled !== false ? 'enabled' : 'disabled'}</div>
              </div>
              <label className="pwd-inline">
                <input type="password" placeholder="New password" value={pass} onChange={e => setPass(e.target.value)} style={{ width: 130 }} />
                <button className="mini-btn" onClick={() => { onSetAdminPass(p, pass); setPass('') }}>Save</button>
              </label>
              <button className="mini-btn" onClick={() => onResetAdmin(p)}>Reset</button>
              <button className={`mini-btn${(p.admin && p.admin.enabled !== false) ? ' danger' : ''}`} onClick={() => onToggleAdmin(p)}>
                {p.admin && p.admin.enabled !== false ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title"><div className="t">Main Admin account</div></div>
          <div className="setting-row">
            <div className="l"><div className="t2">Username</div><div className="d">Shown on the Main Admin login</div></div>
            <div>{main ? main.username : '—'}</div>
          </div>
          <div className="setting-row" style={{ borderBottom: 'none' }}>
            <div className="l"><div className="t2">Status</div><div className="d">Disabled owner account cannot sign in</div></div>
            <button className={`mini-btn${main && main.enabled !== false ? ' danger' : ''}`} onClick={() => onToggleMain()}>
              {main && main.enabled !== false ? 'Disable account' : 'Enable account'}
            </button>
          </div>
          <div className="card-title" style={{ marginTop: 18 }}><div className="t">Change password</div></div>
          <div className="field">
            <label>New password</label>
            <input type="password" value={newMainPass} onChange={e => setNewMainPass(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="pill-btn" onClick={() => { onUpdateMain({ password: newMainPass }); setNewMainPass('') }}>Update password</button>
        </div>
      </div>
      <div className="notice" style={{ marginTop: 18 }}>Destructive global reset is intentionally not available here — project data is never wiped from the owner dashboard.</div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────── Modals
function ConfirmDialog({ title, message, onClose, onConfirm }) {
  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal">
        <h3>{title}</h3>
        <div className="empty" style={{ textAlign: 'left' }}>{message}</div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={() => { onConfirm(); onClose() }}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

function TeamModal({ projects, allTeams, projectId, team, onClose, onSave }) {
  const [selProj, setSelProj] = useState(team ? team.projectId : (projectId || (projects[0] && projects[0].id) || ''))
  const [name, setName] = useState(team ? team.project : '')
  const [description, setDescription] = useState(team ? (team.description || '') : '')
  const [leader, setLeader] = useState(team ? team.leader : '')
  const [membersRaw, setMembersRaw] = useState(team ? team.members.join(', ') : '')
  const [username, setUsername] = useState(team ? (team.username || '') : '')
  const [password, setPassword] = useState(team ? (team.password || '') : '')
  const [enabled, setEnabled] = useState(team ? team.enabled !== false : true)
  const [error, setError] = useState('')

  const submit = () => {
    const n = name.trim()
    const l = leader.trim()
    const members = dedupeMembers(l, membersRaw)
    if (!n || !l) { setError('Project name and team leader are required.'); return }
    if (members.length < 1) { setError('Add at least one member besides the leader.'); return }
    const clash = allTeams.some(t => t.id !== (team && team.id) && norm(t.project) === norm(n))
    if (clash) { setError(`A team is already working on "${n}". Project names must be unique.`); return }
    const uname = username.trim() || slugify(n)
    const uclash = allTeams.some(t => t.id !== (team && team.id) && norm(t.username) === norm(uname))
    if (uclash) { setError(`The login username "${uname}" is already taken. Choose another.`); return }
    onSave({
      projectId: selProj,
      id: team ? team.id : undefined,
      team: { project: n, description, leader, members, username: uname, password, enabled },
    })
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h3>{team ? ('Edit team — ' + team.project) : 'Add team'}</h3>
        <Field label="Website / project">
          <select value={selProj} onChange={e => setSelProj(e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{projectTitle(p)}</option>)}
          </select>
        </Field>
        <Field label="Team name">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PropMatch" />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional short description" />
        </Field>
        <Field label="Team leader">
          <input value={leader} onChange={e => setLeader(e.target.value)} placeholder="e.g. Sudhanshu Mathur" />
        </Field>
        <Field label="Other members">
          <input value={membersRaw} onChange={e => setMembersRaw(e.target.value)} placeholder="comma-separated, e.g. Vishal, Suryansh" />
          <div className="hint">Separate names with commas. At least 1 required, besides the leader.</div>
        </Field>
        <div className="task-grid-fields">
          <Field label="Login username">
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder={`auto: ${slugify(name) || 'team'}`} />
          </Field>
          <Field label="Password">
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder={team ? 'keep current' : `auto: ${randomPass()}`} />
          </Field>
        </div>
        <label className="toggle-row">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          <span>Team can sign in</span>
        </label>
        {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  )
}

function TaskModal({ projects, allTeams, projectId, teamId, task, onClose, onSave }) {
  const initialProject = task ? task.projectId : (projectId || (projects[0] && projects[0].id) || '')
  const initialTeam = task ? task.teamId : (teamId || '')
  const [selProj, setSelProj] = useState(initialProject)
  const [selTeam, setSelTeam] = useState(initialTeam)
  const [title, setTitle] = useState(task ? task.title : '')
  const [description, setDescription] = useState(task ? (task.description || '') : '')
  const [status, setStatus] = useState(task ? task.status : 'todo')
  const [priority, setPriority] = useState(task ? task.priority : 'medium')
  const [assignedTo, setAssignedTo] = useState(task ? (task.assignedTo || '') : '')
  const [deadline, setDeadline] = useState(task ? (task.deadline || '') : '')
  const [progress, setProgress] = useState(task ? (Number(task.progress) || 0) : 0)
  const [error, setError] = useState('')

  const options = allTeams.filter(t => t.projectId === selProj)
  const team = options.find(t => t.id === selTeam)
  const assignees = team ? memberNames(team) : []

  const submit = () => {
    if (!norm(title)) { setError('Task title is required.'); return }
    if (!selTeam) { setError('Choose a team for this task.'); return }
    onSave({
      projectId: selProj,
      teamId: selTeam,
      task: {
        id: task ? task.id : undefined,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assignedTo: assignedTo.trim(),
        deadline: deadline.trim(),
        progress: status === 'done' ? 100 : progress,
        createdAt: task ? task.createdAt : Date.now(),
      },
    })
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h3>{task ? 'Edit task' : 'Add task'}</h3>
        <div className="task-grid-fields">
          <Field label="Website / project">
            <select value={selProj} onChange={e => { setSelProj(e.target.value); setSelTeam('') }}>
              {projects.map(p => <option key={p.id} value={p.id}>{projectTitle(p)}</option>)}
            </select>
          </Field>
          <Field label="Team">
            <select value={selTeam} onChange={e => setSelTeam(e.target.value)}>
              <option value="">— choose team —</option>
              {options.map(t => <option key={t.id} value={t.id}>{t.project}{t.enabled === false ? ' · off' : ''}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Title">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Build login screen" />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details" />
        </Field>
        <div className="task-grid-fields">
          <Field label="Status">
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {TASK_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              {TASK_PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Assigned to">
            <input list="ma-task-assignees" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Team member" />
            <datalist id="ma-task-assignees">{assignees.map(n => <option key={n} value={n} />)}</datalist>
          </Field>
          <Field label="Deadline">
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </Field>
        </div>
        <Field label={`Progress — ${status === 'done' ? 100 : progress}%`}>
          <input type="range" min="0" max="100" step="5" value={status === 'done' ? 100 : progress} onChange={e => setProgress(Number(e.target.value))} />
        </Field>
        {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save task</button>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ team, onClose, onEdit, onGoTasks }) {
  const pct = progressPct(team)
  const ts = taskStats(team)
  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal">
        <h3>{team.project}</h3>
        {team.description && <div className="page-sub" style={{ marginBottom: 14 }}>{team.description}</div>}
        <div className="setting-row">
          <div className="l"><div className="t2">Leader</div><div className="d">{team.leader}</div></div>
          <div className="proj-badge">{teamSize(team)} members</div>
        </div>
        <div className="setting-row">
          <div className="l"><div className="t2">Members</div><div className="d">{(team.members || []).join(', ') || '—'}</div></div>
        </div>
        <div className="setting-row">
          <div className="l"><div className="t2">Login</div><div className="d"><code>{team.username}</code> · <code>{team.password}</code></div></div>
          <span className="status-badge active">{team.enabled !== false ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div className="setting-row">
          <div className="l"><div className="t2">Progress</div><div className="d">{ts.total ? `${ts.done}/${ts.total} task(s) done` : 'No tasks yet'}</div></div>
          <div className="bar-line" style={{ width: 90 }}><div className="fill" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button className="pill-btn" onClick={onGoTasks}>Tasks</button>
          <button className="btn-primary" onClick={onEdit}>Edit team</button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────── Main
export default function MainAdminApp() {
  const {
    session, projects, admins, syncState, live, logout, toast,
    updateAnyProject, updateAnyTeam, addTeamToProject, deleteTeamFromProject,
    toggleTeamEnabledInProject, regenTeamPasswordInProject, toggleTeamProgressInProject,
    saveTaskInProject, deleteTaskInProject, updateAnyTask,
    updateMainAdmin, toggleMainAdmin,
  } = useApp()

  const [view, setViewState] = useState(() => {
    const v = location.hash.replace('#/', '')
    return VALID_VIEWS.includes(v) ? v : DEFAULT_VIEW
  })
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filters, setFiltersState] = useState({ query: '', project: 'all', team: 'all', status: 'all', priority: 'all' })
  const [teamModal, setTeamModal] = useState(null)          // { projectId, team } (team may have projectId)
  const [taskModal, setTaskModal] = useState(null)          // { projectId, teamId, task }
  const [projectModal, setProjectModal] = useState(null)    // projectId
  const [adminModal, setAdminModal] = useState(null)        // projectId
  const [detail, setDetail] = useState(null)                // { projectId, teamId }
  const [confirm, setConfirm] = useState(null)

  const allTeams = useMemo(() => projects.flatMap(p => p.teams.map(t => ({ ...t, projectId: p.id }))), [projects])

  useEffect(() => {
    const onHash = () => {
      const v = location.hash.replace('#/', '')
      if (VALID_VIEWS.includes(v)) setViewState(v)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setView = (v) => { setViewState(v); location.hash = '#/' + v; setSidebarOpen(false) }
  const setFilters = (patch) => setFiltersState(f => ({ ...f, ...patch }))

  const goView = (v, projectId) => {
    if (projectId) setFiltersState(f => ({ ...f, project: projectId, team: 'all' }))
    setView(v)
  }

  const requestConfirm = (title, message, fn) => setConfirm({ title, message, fn })

  const findTeam = (pid, tid) => {
    const p = projects.find(x => x.id === pid)
    return p ? (p.teams.find(t => t.id === tid) || null) : null
  }

  // helpers (all Main-Admin only in practice)
  const saveTeam = (data, id) => {
    const { projectId, team, ...rest } = data
    const pid = data.projectId || (data.team && data.team.projectId)
    if (id) {
      updateAnyTeam(pid, id, data.team)
      toast('Team updated.')
    } else {
      const t = addTeamToProject(pid, data.team)
      toast(t ? `Team added to ${projectTitle(projects.find(x => x.id === pid) || {})}. Login: ${t.username} / ${t.password}` : 'Could not add team.')
    }
    setTeamModal(null)
  }

  const handleToggleTeam = (pid, tid) => {
    const next = toggleTeamEnabledInProject(pid, tid)
    const t = findTeam(pid, tid)
    toast(next ? `"${t ? t.project : 'Team'}" re-enabled.` : `"${t ? t.project : 'Team'}" disabled — its login no longer works.`)
  }

  const handleDeleteTeam = (pid, team) => {
    requestConfirm(
      'Remove this team?',
      `"${team.project}" and its ${teamSize(team)} members will be removed, and its login will stop working.`,
      () => {
        deleteTeamFromProject(pid, team.id)
        toast('Team removed.')
      }
    )
  }

  const handleRegenTeam = (pid, tid) => {
    const t = findTeam(pid, tid)
    requestConfirm(
      'Regenerate password?',
      `A new password will be created for "${t ? t.project : 'team'}". Their old password will stop working.`,
      () => {
        const pass = regenTeamPasswordInProject(pid, tid)
        toast(`New password for ${t ? t.project : 'team'}: ${pass}`)
      }
    )
  }

  const saveTask = (data) => {
    const { projectId, teamId, task } = data
    if (!teamId) { toast('Choose a team for this task.', 'error'); return }
    const saved = saveTaskInProject(projectId, teamId, task)
    toast(task.id ? 'Task updated.' : `Task added to ${(allTeams.find(t => t.id === teamId) || {}).project || 'team'}.`)
    setTaskModal(null)
  }

  const handleDeleteTask = (pid, tid, task) => {
    requestConfirm(
      'Delete this task?',
      `"${task.title}" will be removed.`,
      () => {
        deleteTaskInProject(pid, tid, task.id)
        toast('Task removed.')
      }
    )
  }

  const handleStatusChange = (pid, tid, taskId, status) => {
    updateAnyTask(pid, tid, taskId, status === 'done' ? { status, progress: 100 } : { status })
  }

  const handleToggleProject = (p, archived) => {
    updateAnyProject(p.id, { status: archived ? 'archived' : 'active' })
    toast(archived ? `${projectTitle(p)} archived.` : `${projectTitle(p)} unarchived.`)
  }

  const saveProject = (projectId, data) => {
    updateAnyProject(projectId, data)
    toast('Project updated.')
    setProjectModal(null)
  }

  const handleResetAdmin = (p) => {
    requestConfirm(
      'Reset admin password?',
      `A new password will be generated for the ${projectTitle(p)} admin. Their old password stops working.`,
      () => {
        const pass = randomPass()
        updateAnyProject(p.id, { admin: { ...(p.admin || {}), password: pass } })
        toast(`New ${projectTitle(p)} admin password: ${pass}`)
      }
    )
  }

  const handleSetAdminPass = (p, raw) => {
    const pass = String(raw || '').trim()
    if (!pass) { toast('Enter a new admin password first.', 'error'); return }
    updateAnyProject(p.id, { admin: { ...(p.admin || {}), password: pass } })
    toast(`${projectTitle(p)} admin password updated.`)
  }

  const handleToggleAdmin = (p) => {
    const next = !(p.admin && p.admin.enabled !== false)
    updateAnyProject(p.id, { admin: { ...(p.admin || {}), enabled: next } })
    toast(next ? `${projectTitle(p)} admin re-enabled.` : `${projectTitle(p)} admin disabled — they can no longer sign in.`)
  }

  const saveAdmin = (projectId, { username, password }) => {
    const p = projects.find(x => x.id === projectId)
    updateAnyProject(projectId, { admin: { ...(p.admin || {}), username, password } })
    toast('Project admin updated.')
    setAdminModal(null)
  }

  const saveMain = (patch) => {
    updateMainAdmin(patch)
    toast('Main Admin account updated.')
  }

  const editingTeamObj = teamModal
    ? (teamModal.team && teamModal.team.id ? { ...teamModal.team, projectId: teamModal.projectId } : null)
    : null

  const detailTeam = detail ? findTeam(detail.projectId, detail.teamId) : null

  if (!session || session.role !== 'main') return null

  return (
    <>
      <div className="topbar">
        <button className="lg-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setView(DEFAULT_VIEW)}>
          <span className="mark"><Logo size={14} /></span>WebTech Roster
        </div>
        <div className="topbar-center">
          <div className="topbar-title">Main Admin</div>
          <div className="page-sub-sm">Website Administration</div>
        </div>
        <div className="topbar-right">
          <SyncNote state={syncState} live={live} />
          <div className="user">
            <div className="avatar" style={{ background: 'linear-gradient(135deg,#F0299B,#8B5CF6)' }}>M</div>
            <div>
              <div className="name">Main Admin</div>
              <div className="sub">{admins && admins.main ? admins.main.name : 'Website Admin'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="shell">
        <div className={`sidebar${sidebarOpen ? ' lg-open' : ''}`}>
          <div className="lg-side-brand">
            <span className="mark"><Logo size={13} /></span><span>WebTech Roster</span>
          </div>
          <div className="nav-label" style={{ marginTop: 6 }}>Main Admin</div>
          {navGroups.map(g => (
            <div key={g.label}>
              {g.label !== 'Overview' && <div className="nav-label">{g.label}</div>}
              {g.items.map(v => (
                <div key={v} className={`nav-item${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
                  {icons[v]}{labels[v]}
                </div>
              ))}
            </div>
          ))}
          <div className="lg-side-foot">
            <div className="lg-side-user">
              <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: 'linear-gradient(135deg,#F0299B,#8B5CF6)' }}>M</div>
              <div>
                <div className="lg-side-name">Main Administrator</div>
                <div className="lg-side-on">● Online</div>
              </div>
            </div>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
        {sidebarOpen && <div className="lg-backdrop" onClick={() => setSidebarOpen(false)} />}

        <div className="main">
          {view === 'overview' && (
            <Overview
              projects={projects}
              onGoView={goView}
              onOpenTeam={(pid, tid) => setDetail({ projectId: pid, teamId: tid })}
              onEditProject={(pid) => setProjectModal(pid)}
            />
          )}
          {view === 'projects' && (
            <Projects
              projects={projects}
              onEditProject={(pid) => setProjectModal(pid)}
              onToggleArchive={handleToggleProject}
              onGoView={goView}
            />
          )}
          {view === 'admins' && (
            <Admins
              projects={projects}
              onEditAdmin={(p) => setAdminModal(p.id)}
              onResetAdmin={handleResetAdmin}
              onToggleAdmin={handleToggleAdmin}
            />
          )}
          {view === 'teams' && (
            <Teams
              projects={projects}
              search={search}
              onAdd={(projectId) => setTeamModal({ projectId, team: null })}
              onEdit={(pid, tid) => {
                const t = findTeam(pid, tid)
                if (t) setTeamModal({ projectId: pid, team: { ...t, projectId: pid } })
              }}
              onDelete={handleDeleteTeam}
              onToggle={handleToggleTeam}
              onOpen={(pid, tid) => setDetail({ projectId: pid, teamId: tid })}
              onGoTasks={(pid, tid) => { setFilters({ project: pid, team: tid }); setView('tasks') }}
            />
          )}
          {view === 'members' && (
            <Members
              projects={projects}
              search={search}
              onEditTeam={(pid, tid) => {
                const t = findTeam(pid, tid)
                if (t) setTeamModal({ projectId: pid, team: { ...t, projectId: pid } })
              }}
            />
          )}
          {view === 'tasks' && (
            <Tasks
              projects={projects}
              filters={filters}
              setFilters={setFilters}
              onAdd={(projectId, teamId) => setTaskModal({ projectId, teamId, task: null })}
              onEdit={(pid, tid, task) => setTaskModal({ projectId: pid, teamId: tid, task: { ...task, projectId: pid, teamId: tid } })}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          )}
          {view === 'progress' && (
            <Progress
              projects={projects}
              onToggleProgress={(pid, tid, key) => {
                toggleTeamProgressInProject(pid, tid, key)
                toast('Progress updated.')
              }}
            />
          )}
          {view === 'settings' && (
            <Settings
              projects={projects}
              admins={admins}
              onToggleArchive={handleToggleProject}
              onResetAdmin={handleResetAdmin}
              onToggleAdmin={handleToggleAdmin}
              onSetAdminPass={handleSetAdminPass}
              onUpdateMain={saveMain}
              onToggleMain={() => { toggleMainAdmin(); toast('Main Admin account updated.') }}
            />
          )}
        </div>
      </div>

      {teamModal && (
        <TeamModal
          projects={projects}
          allTeams={allTeams}
          projectId={teamModal.projectId}
          team={editingTeamObj}
          onClose={() => setTeamModal(null)}
          onSave={(d) => saveTeam(d, editingTeamObj && editingTeamObj.id)}
        />
      )}
      {taskModal && (
        <TaskModal
          projects={projects}
          allTeams={allTeams}
          projectId={taskModal.projectId}
          teamId={taskModal.teamId}
          task={taskModal.task}
          onClose={() => setTaskModal(null)}
          onSave={saveTask}
        />
      )}
      {projectModal && (
        <ProjectModal
          project={projects.find(p => p.id === projectModal) || null}
          onClose={() => setProjectModal(null)}
          onSave={(data) => saveProject(projectModal, data)}
        />
      )}
      {adminModal && (
        <AdminModal
          project={projects.find(p => p.id === adminModal) || null}
          onClose={() => setAdminModal(null)}
          onSave={(username, password) => saveAdmin(adminModal, { username, password })}
        />
      )}
      {detailTeam && (
        <DetailModal
          team={detailTeam}
          onClose={() => setDetail(null)}
          onEdit={() => {
            const pid = detail.projectId
            setDetail(null)
            setTeamModal({ projectId: pid, team: { ...detailTeam, projectId: pid } })
          }}
          onGoTasks={() => {
            setFilters({ project: detail.projectId, team: detail.teamId })
            setView('tasks')
            setDetail(null)
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog title={confirm.title} message={confirm.message} onClose={() => setConfirm(null)} onConfirm={confirm.fn} />
      )}
    </>
  )
}

function ProjectModal({ project, onClose, onSave }) {
  const [name, setName] = useState(project ? project.name : '')
  const [description, setDescription] = useState(project ? (project.description || '') : '')
  const [status, setStatus] = useState(project ? project.status : 'active')
  const [adminUser, setAdminUser] = useState(project && project.admin ? project.admin.username : '')
  const [error, setError] = useState('')
  const submit = () => {
    if (!name.trim()) { setError('Project name is required.'); return }
    onSave({
      name: name.trim(),
      description: description.trim(),
      status,
      admin: { ...(project && project.admin ? project.admin : {}), username: adminUser.trim() || ((project && project.admin && project.admin.username) || 'admin') },
    })
  }
  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal">
        <h3>{projectTitle(project) + ' — edit project'}</h3>
        <Field label="Project name">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Web Tech" />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this website about?" />
        </Field>
        <div className="task-grid-fields">
          <Field label="Status">
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Admin username">
            <input value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="admin login" />
          </Field>
        </div>
        {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  )
}

function AdminModal({ project, onClose, onSave }) {
  const [username, setUsername] = useState(project && project.admin ? project.admin.username : '')
  const [password, setPassword] = useState('')
  const submit = () => {
    if (!username.trim()) { setError('Username is required.'); return }
    onSave(username.trim(), password.trim() || undefined)
  }
  const [error, setError] = useState('')
  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal">
        <h3>{project ? projectTitle(project) + ' Admin — edit' : 'Edit admin'}</h3>
        <Field label="Username">
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin login" />
        </Field>
        <Field label="New password">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
        </Field>
        {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  )
}