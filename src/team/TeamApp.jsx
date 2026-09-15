import { useState } from 'react'
import { useApp } from '../store'
import { Logo } from '../components/Login'
import SyncNote from '../components/SyncNote'
import { initials, colorFor, norm, dedupeMembers, progressPct } from '../utils'
import { PROGRESS_ITEMS } from '../seed'

export default function TeamApp() {
  const { teams, session, syncState, live, updateTeams, toast, logout } = useApp()
  const team = teams.find(t => t.id === session.teamId)
  if (!team) return null

  const toggleProgress = (key) => {
    const next = teams.map(t => t.id === team.id
      ? { ...t, progress: { ...t.progress, [key]: !t.progress[key] } }
      : t)
    updateTeams(next)
  }

  const saveProfile = (data) => {
    const next = teams.map(t => t.id === team.id ? { ...t, ...data } : t)
    updateTeams(next)
    toast('Saved. Your admin can see these changes.')
  }

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <span className="mark"><Logo size={14} /></span>WebTech Roster
        </div>
        <div className="topbar-right">
          <div className="user">
            <div className="avatar" style={{ background: colorFor(team.id) }}>{initials(team.leader)}</div>
            <div>
              <div className="name">{team.project}</div>
              <div className="sub">Team account</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="team-main">
        <div className="page-head">
          <div>
            <h1>{team.project}</h1>
            <div className="page-sub">Update your project details and log your progress — admin sees this live.</div>
          </div>
        </div>
        <SyncNote state={syncState} live={live} />

        <ProjectForm key={team.id} team={team} teams={teams} onSave={saveProfile} />
        <div className="card">
          <div className="card-title"><div className="t">Tasks assigned by your admin</div></div>
          {(team.tasks || []).length === 0
            ? <div className="empty">No tasks yet. Ask your admin to add some — they appear here automatically.</div>
            : (team.tasks || []).map(t => (
              <div key={t.id} className="task-row">
                <div className="task-main">
                  <span className={`status-icon s-${t.status}`}>{t.status === 'done' ? '●' : t.status === 'in_progress' ? '◐' : '○'}</span>
                  <div className="task-body">
                    <div className="task-title-line">
                      <span className="task-title">{t.title}</span>
                      {t.deadline && <span className="task-deadline">due {t.deadline}</span>}
                    </div>
                    <div className="task-sub">
                      <span className={`prio-badge ${t.priority || 'medium'}`}>{t.priority || 'medium'}</span>
                      <span className={`status-select`} style={{ fontSize: 10.5 }}>{t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'In progress' : 'To do'}</span>
                      {t.assignedTo && <span className="chip">{t.assignedTo}</span>}
                      {t.description && <span className="task-desc">{t.description}</span>}
                    </div>
                    <div className="task-progress">
                      <div className="bar-line"><div className="fill" style={{ width: `${Number(t.progress) || 0}%` }} /></div>
                      <span className="pct">{Number(t.progress) || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="card">
          <div className="card-title"><div className="t">Progress checklist</div></div>
          <div className="progress-summary">
            <ProgressRing team={team} />
            <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
              Tick off each stage as you complete it. Saved instantly — your admin can see this update live.
            </div>
          </div>
          <div className="checklist">
            {PROGRESS_ITEMS.map(item => {
              const on = !!team.progress[item.key]
              return (
                <div key={item.key} className={`check-row${on ? ' done' : ''}`} onClick={() => toggleProgress(item.key)}>
                  <div className={`check-box${on ? ' on' : ''}`}>
                    {on && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  <div className="cl">{item.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

function ProgressRing({ team }) {
  const pct = progressPct(team)
  return (
    <div
      className="progress-ring"
      style={{ background: `conic-gradient(var(--pink) 0% ${pct}%, var(--track) ${pct}% 100%)` }}
    >
      <span>{pct}%</span>
    </div>
  )
}

function ProjectForm({ team, teams, onSave }) {
  const [project, setProject] = useState(team.project)
  const [description, setDescription] = useState(team.description || '')
  const [leader, setLeader] = useState(team.leader)
  const [membersRaw, setMembersRaw] = useState(team.members.join(', '))
  const [error, setError] = useState('')

  const save = () => {
    const p = project.trim()
    const d = description.trim()
    const l = leader.trim()
    const members = dedupeMembers(l, membersRaw)
    if (!p || !l) { setError('Project name and team leader are required.'); return }
    if (members.length < 1) { setError('Add at least one member besides the leader.'); return }
    const clash = teams.some(x => x.id !== team.id && norm(x.project) === norm(p))
    if (clash) { setError(`Another team is already working on "${p}". Project names must be unique.`); return }
    setError('')
    onSave({ project: p, description: d, leader: l, members })
  }

  return (
    <div className="card">
      <div className="card-title"><div className="t">Project details</div></div>
      <div className="field">
        <label>Project name</label>
        <input value={project} onChange={e => setProject(e.target.value)} />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" />
      </div>
      <div className="field">
        <label>Team leader</label>
        <input value={leader} onChange={e => setLeader(e.target.value)} />
      </div>
      <div className="field">
        <label>Other members</label>
        <input value={membersRaw} onChange={e => setMembersRaw(e.target.value)} placeholder="comma-separated names" />
        <div className="hint">At least 1 required, besides the leader. Duplicate names are removed automatically.</div>
      </div>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
      <div className="modal-actions" style={{ marginTop: 6 }}>
        <button className="btn-primary" onClick={save}>Save changes</button>
      </div>
    </div>
  )
}