import { useApp } from '../../store'
import { matchesSearch, progressPct, teamSize, taskStats, memberNames, projectProgressPct } from '../../utils'

export default function ProjectsView({ search, onAdd, onEdit, onDelete, onOpen, onEditProject, onToggleArchive, onManageTasks }) {
  const { teams, project } = useApp()
  const visible = teams.filter(t => matchesSearch(t, search))
  const people = teams.reduce((s, t) => s + memberNames(t).length, 0)
  const tasks = taskStats(teams)

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <div className="page-sub">Your project, and every team project beneath it</div>
        </div>
        <div className="head-actions">
          <button className="btn-primary" onClick={onAdd}>+ Add team</button>
        </div>
      </div>

      {project && (
        <div className="card proj-head">
          <div className="proj-head-main">
            <div className="proj-head-name">
              <span className={`status-badge ${project.status === 'archived' ? 'archived' : 'active'}`}>
                {project.status === 'archived' ? 'Archived' : 'Active'}
              </span>
              <h2>{project.name}</h2>
            </div>
            <div className="proj-head-desc">{project.description || 'No description yet.'}</div>
            <div className="proj-head-meta">
              <span>{teams.length} team(s)</span>·<span>{people} member(s)</span>·<span>{tasks.total} task(s)</span>
            </div>
          </div>
          <div className="proj-head-side">
            <div className="proj-head-pct">{projectProgressPct(teams)}%</div>
            <div className="bar-line"><div className="fill" style={{ width: `${projectProgressPct(teams)}%` }} /></div>
          </div>
          <div className="proj-head-actions">
            {project.status === 'archived'
              ? <button className="pill-btn" onClick={() => onToggleArchive(false)}>Unarchive</button>
              : <button className="pill-btn" onClick={() => onToggleArchive(true)}>Archive</button>
            }
            <button className="pill-btn" onClick={() => onEditProject()}>Edit</button>
            <button className="pill-btn" onClick={() => onManageTasks()}>Tasks</button>
          </div>
        </div>
      )}

      <h3 className="group-label">Team projects</h3>
      <div className="proj-grid">
        {teams.length === 0 && <div className="empty" style={{ gridColumn: '1/-1' }}>No projects yet. Click "+ Add team" to add the first one.</div>}
        {teams.length > 0 && visible.length === 0 && <div className="empty" style={{ gridColumn: '1/-1' }}>No matches for your search.</div>}
        {visible.map(t => {
          const pct = progressPct(t)
          return (
            <div key={t.id} className="proj-card">
              <div className="proj-card-click" onClick={() => onOpen(t.id)}>
                <div className="proj-card-head">
                  <div className="name">{t.project}</div>
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
                <button className="icon-btn-lg" onClick={() => onEdit(t.id)}>Edit</button>
                <button className="icon-btn-lg danger" onClick={() => onDelete(t)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}