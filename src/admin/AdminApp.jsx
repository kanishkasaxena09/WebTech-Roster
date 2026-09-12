import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Logo } from '../components/Login'
import SyncNote from '../components/SyncNote'
import TeamsView from './views/TeamsView'
import MembersView from './views/MembersView'
import ProjectsView from './views/ProjectsView'
import ProgressView from './views/ProgressView'
import SettingsView from './views/SettingsView'
import TeamModal from './modals/TeamModal'
import DetailModal from './modals/DetailModal'
import ConfirmDialog from './modals/ConfirmDialog'
import { norm, slugify, randomPass, teamSize, backfillTeam } from '../utils'
import { emptyProgress } from '../seed'

const VALID_VIEWS = ['teams', 'members', 'projects', 'progress', 'settings']
const NEW_TEAM = '__new__'

const icons = {
  teams: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  members: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  projects: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 4v16" /></svg>,
  progress: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.7.2 1.3.62 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04z" /></svg>,
}

const labels = {
  teams: 'Teams',
  members: 'Members',
  projects: 'Projects',
  progress: 'Progress',
  settings: 'Settings',
}

export default function AdminApp() {
  const { syncState, logout, teams, updateTeams, toast } = useApp()
  const [view, setViewState] = useState(() => {
    const v = location.hash.replace('#/', '')
    return VALID_VIEWS.includes(v) ? v : 'teams'
  })
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const setView = (v) => {
    setViewState(v)
    location.hash = '#/' + v
  }

  useEffect(() => {
    const onHash = () => {
      const v = location.hash.replace('#/', '')
      if (VALID_VIEWS.includes(v)) setViewState(v)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const openTeamModal = (id) => setEditingId(id || NEW_TEAM)
  const openDetail = (id) => setDetailId(id)

  const handleSaveTeam = (data, id) => {
    if (id && id !== NEW_TEAM) {
      const editing = teams.find(t => t.id === id)
      if (!editing) return
      const next = teams.map(t => t.id === id ? { ...t, ...data } : t)
      updateTeams(next)
      toast('Team updated.')
    } else {
      const next = [...teams, backfillTeam({
        id: 't' + Date.now(),
        project: data.project,
        description: data.description,
        leader: data.leader,
        members: data.members,
        username: slugify(data.project),
        password: randomPass(),
        progress: emptyProgress(),
      })]
      updateTeams(next)
      toast(`Team added. Login: ${slugify(data.project)}`)
    }
    setEditingId(null)
  }

  const handleDeleteTeam = (team) => {
    requestConfirm(
      'Remove this team?',
      `"${team.project}" and its ${teamSize(team)} members will be removed, and its login will stop working.`,
      () => {
        updateTeams(teams.filter(x => x.id !== team.id))
        toast('Team removed.')
      }
    )
  }

  const requestConfirm = (title, message, fn) => setConfirm({ title, message, fn })

  const editing = editingId !== null
    ? (editingId === NEW_TEAM ? null : teams.find(t => t.id === editingId) || null)
    : null
  const detail = detailId ? teams.find(t => t.id === detailId) || null : null

  return (
    <>
      <div className="topbar">
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setView('teams')}>
          <span className="mark"><Logo size={14} /></span>WebTech Roster
        </div>
        <div className="search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a team, project or member…" />
        </div>
        <div className="topbar-right">
          <div className="user">
            <div className="avatar">A</div>
            <div>
              <div className="name">Course Admin</div>
              <div className="sub">Web Tech · Sem 5</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="shell">
        <div className="sidebar">
          {VALID_VIEWS.slice(0, 4).map(v => (
            <div key={v} className={`nav-item${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              {icons[v]}{labels[v]}
            </div>
          ))}
          <div className="nav-label">Workstation</div>
          <div className={`nav-item${view === 'settings' ? ' active' : ''}`} onClick={() => setView('settings')}>
            {icons.settings}{labels.settings}
          </div>
        </div>

        <div className="main">
          {view === 'teams' && (
            <TeamsView
              search={search}
              onAdd={() => openTeamModal()}
              onEdit={openTeamModal}
              onDelete={handleDeleteTeam}
              onOpen={openDetail}
            />
          )}
          {view === 'members' && <MembersView search={search} />}
          {view === 'projects' && (
            <ProjectsView
              search={search}
              onAdd={() => openTeamModal()}
              onEdit={openTeamModal}
              onDelete={handleDeleteTeam}
              onOpen={openDetail}
            />
          )}
          {view === 'progress' && <ProgressView onOpen={openDetail} />}
          {view === 'settings' && (
            <SettingsView
              teams={teams}
              syncState={syncState}
              requestConfirm={requestConfirm}
            />
          )}
        </div>
      </div>

      {editingId !== null && (
        <TeamModal
          team={editing}
          teams={teams}
          onClose={() => setEditingId(null)}
          onSave={(data) => handleSaveTeam(data, editingId)}
        />
      )}
      {detail && (
        <DetailModal
          team={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => { setDetailId(null); openTeamModal(detail.id) }}
        />
      )}
      {confirm && (
        <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
      )}
    </>
  )
}