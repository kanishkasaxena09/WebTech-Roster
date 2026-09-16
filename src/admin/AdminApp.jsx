import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Logo } from '../components/Login'
import OverviewView from './views/OverviewView'
import TeamsView from './views/TeamsView'
import MembersView from './views/MembersView'
import ProjectsView from './views/ProjectsView'
import ProgressView from './views/ProgressView'
import TasksView from './views/TasksView'
import SettingsView from './views/SettingsView'
import TeamModal from './modals/TeamModal'
import DetailModal from './modals/DetailModal'
import ProjectModal from './modals/ProjectModal'
import TaskModal from './modals/TaskModal'
import ConfirmDialog from './modals/ConfirmDialog'
import { teamSize } from '../utils'

const VALID_VIEWS = ['overview', 'projects', 'teams', 'members', 'tasks', 'progress', 'settings']
const DEFAULT_VIEW = 'teams'
const NEW_TEAM = '__new__'

const icons = {
  overview: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z" /><path d="M3 9h18M9 3v18" /></svg>,
  projects: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 4v16" /></svg>,
  teams: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  members: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M21 12a9 9 0 1 0-3-6.7M21 3v6h-6" /></svg>,
  tasks: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  progress: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.7.2 1.3.62 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04z" /></svg>,
}

const navGroups = [
  { label: 'Overview', items: ['overview'] },
  { label: 'Manage', items: ['projects', 'teams', 'members', 'tasks', 'progress'] },
  { label: 'Workstation', items: ['settings'] },
]

const labels = {
  overview: 'Overview',
  projects: 'Projects',
  teams: 'Team',
  members: 'Members',
  tasks: 'Tasks',
  progress: 'Progress',
  settings: 'Settings',
}

export default function AdminApp() {
  const {
    syncState, logout, teams, project, toast,
    addTeam, updateTeam, removeTeam, toggleTeamEnabled,
    saveTask, deleteTask, setTaskStatus, toggleTeamProgress,
    updateProject,
  } = useApp()

  const [view, setViewState] = useState(() => {
    const v = location.hash.replace('#/', '')
    return VALID_VIEWS.includes(v) ? v : DEFAULT_VIEW
  })
  const [taskFilter, setTaskFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [taskModal, setTaskModal] = useState(null)
  const [projectEdit, setProjectEdit] = useState(false)
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

  const requestConfirm = (title, message, fn) => setConfirm({ title, message, fn })

  const openTeamModal = (id) => setEditingId(id || NEW_TEAM)
  const openDetail = (id) => setDetailId(id)
  const goTasks = (teamId) => {
    setTaskFilter(teamId || 'all')
    setView('tasks')
  }
  const goProjects = () => setView('projects')

  const handleSaveTeam = (data, id) => {
    if (id && id !== NEW_TEAM) {
      updateTeam(id, data)
      toast('Team updated.')
    } else {
      const t = addTeam(data)
      toast(t ? `Team added. Login: ${t.username} / ${t.password}` : 'Could not add team.')
    }
    setEditingId(null)
  }

  const handleToggleTeam = (id) => {
    const enabled = toggleTeamEnabled(id)
    const t = teams.find(x => x.id === id)
    toast(enabled ? `"${t ? t.project : 'Team'}" re-enabled.` : `"${t ? t.project : 'Team'}" disabled — its login no longer works.`)
  }

  const handleDeleteTeam = (team) => {
    requestConfirm(
      'Remove this team?',
      `"${team.project}" and its ${teamSize(team)} members will be removed, and its login will stop working.`,
      () => {
        removeTeam(team.id)
        toast('Team removed.')
      }
    )
  }

  const handleSaveTask = (data) => {
    const { teamId, ...task } = data
    if (!teamId) { toast('Choose a team for this task.', 'error'); return }
    const saved = saveTask(teamId, task)
    if (task.id) toast('Task updated.')
    else toast(`Task added to ${(teams.find(t => t.id === teamId) || {}).project || 'team'}.`)
    setTaskModal(null)
  }

  const handleDeleteTask = (team, task) => {
    requestConfirm(
      'Delete this task?',
      `"${task.title}" will be removed from ${team.project}.`,
      () => {
        deleteTask(team.id, task.id)
        toast('Task removed.')
      }
    )
  }

  const handleStatusChange = (teamId, taskId, status) => {
    setTaskStatus(teamId, taskId, status)
  }

  const handleToggleProgress = (teamId, key) => {
    toggleTeamProgress(teamId, key)
    toast('Progress updated.')
  }

  const handleToggleArchive = (archived) => {
    updateProject({ status: archived ? 'archived' : 'active' })
    toast(archived ? 'Project archived.' : 'Project unarchived.')
  }

  const handleSaveProject = (data) => {
    updateProject(data)
    setProjectEdit(false)
    toast('Project updated.')
  }

  const editing = editingId !== null
    ? (editingId === NEW_TEAM ? null : teams.find(t => t.id === editingId) || null)
    : null
  const detail = detailId ? teams.find(t => t.id === detailId) || null : null

  return (
    <>
      <div className="topbar">
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setView(DEFAULT_VIEW)}>
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
            <div className="avatar">{project ? project.name[0] : 'A'}</div>
            <div>
              <div className="name">{project ? project.name : 'Project'} Admin</div>
              <div className="sub">{project ? project.name : ''}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="shell">
        <div className="sidebar">
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
        </div>

        <div className="main">
          {view === 'overview' && (
            <OverviewView
              onOpenTeam={openDetail}
              onGoProjects={goProjects}
              onGoTasks={goTasks}
              onAddTeam={() => openTeamModal()}
            />
          )}
          {view === 'teams' && (
            <TeamsView
              search={search}
              onAdd={() => openTeamModal()}
              onEdit={openTeamModal}
              onDelete={handleDeleteTeam}
              onOpen={openDetail}
              onToggle={handleToggleTeam}
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
              onEditProject={() => setProjectEdit(true)}
              onToggleArchive={handleToggleArchive}
              onManageTasks={goTasks}
            />
          )}
          {view === 'progress' && (
            <ProgressView onOpen={openDetail} onToggleProgress={handleToggleProgress} />
          )}
          {view === 'tasks' && (
            <TasksView
              teamFilter={taskFilter}
              setTeamFilter={setTaskFilter}
              onAdd={(teamId) => setTaskModal({ teamId: teamId || null, task: null })}
              onEdit={(team, task) => setTaskModal({ teamId: team.id, task })}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onOpenTeam={openDetail}
            />
          )}
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
          onToggleProgress={handleToggleProgress}
          onManageTasks={(teamId) => { setDetailId(null); goTasks(teamId) }}
        />
      )}
      {projectEdit && project && (
        <ProjectModal
          project={project}
          onClose={() => setProjectEdit(false)}
          onSave={handleSaveProject}
        />
      )}
      {taskModal && (
        <TaskModal
          teams={teams}
          teamId={taskModal.teamId}
          task={taskModal.task}
          onClose={() => setTaskModal(null)}
          onSave={handleSaveTask}
        />
      )}
      {confirm && (
        <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
      )}
    </>
  )
}