import { useMemo, useState } from 'react'
import { useApp } from '../../store'
import { memberNames, taskStats } from '../../utils'

const statusIcon = {
  todo: '○',
  in_progress: '◐',
  done: '●',
}

export default function TasksView({ teamFilter, setTeamFilter, onAdd, onEdit, onDelete, onStatusChange, onOpenTeam }) {
  const { teams } = useApp()
  const [query, setQuery] = useState('')

  const stats = useMemo(() => taskStats(teamFilter === 'all' ? teams : teams.filter(t => t.id === teamFilter)), [teams, teamFilter])

  const groups = useMemo(() => {
    const list = teams.filter(t => teamFilter === 'all' || t.id === teamFilter)
    const q = query.trim().toLowerCase()
    return list.map(t => ({
      team: t,
      tasks: (t.tasks || []).filter(task =>
        !q || task.title.toLowerCase().includes(q) || (task.assignedTo || '').toLowerCase().includes(q)),
    }))
  }, [teams, teamFilter, query])

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Task management</h1>
          <div className="page-sub">Break each project down into trackable tasks</div>
        </div>
        <div className="head-actions">
          <button className="btn-primary" onClick={() => onAdd(teamFilter === 'all' ? null : teamFilter)}>+ Add task</button>
        </div>
      </div>

      <div className="task-filters">
        <span className={`task-chip${teamFilter === 'all' ? ' active' : ''}`} onClick={() => setTeamFilter('all')}>All teams</span>
        {teams.map(t => (
          <span key={t.id} className={`task-chip${teamFilter === t.id ? ' active' : ''}`} onClick={() => setTeamFilter(t.id)}>
            {t.project}{!t.enabled ? ' · off' : ''}
          </span>
        ))}
        <input className="task-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter tasks…" />
      </div>

      <div className="task-summary">
        <div className="task-summary-item"><b>{stats.total}</b> total</div>
        <div className="task-summary-item"><b>{stats.active}</b> active</div>
        <div className="task-summary-item"><b>{stats.done}</b> done</div>
      </div>

      {groups.map(g => (
        <div key={g.team.id} className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">
            <div className="t">
              {g.team.project}
              {!g.team.enabled && <span className="enabled-badge" style={{ marginLeft: 8 }}>Disabled</span>}
              <span className="page-sub-sm" style={{ marginLeft: 8 }}>{memberNames(g.team).length} member(s)</span>
            </div>
            <button className="mini-btn" onClick={() => onAdd(g.team.id)}>+ task</button>
          </div>
          {g.tasks.length === 0 && <div className="empty">No tasks here yet. Add one to get started.</div>}
          {g.tasks.map(t => (
            <div key={t.id} className="task-row">
              <div className="task-main" onClick={() => onOpenTeam(g.team.id)}>
                <span className={`status-icon s-${t.status}`}>{statusIcon[t.status] || '○'}</span>
                <div className="task-body">
                  <div className="task-title-line">
                    <span className="task-title">{t.title}</span>
                    {t.deadline && <span className="task-deadline">due {t.deadline}</span>}
                  </div>
                  <div className="task-sub">
                    {t.assignedTo && <span className="chip">{t.assignedTo}</span>}
                    <span className={`prio-badge ${t.priority || 'medium'}`}>{t.priority || 'medium'}</span>
                    {t.description && <span className="task-desc">{t.description}</span>}
                  </div>
                  <div className="task-progress">
                    <div className="bar-line"><div className="fill" style={{ width: `${Number(t.progress) || 0}%` }} /></div>
                    <span className="pct">{Number(t.progress) || 0}%</span>
                  </div>
                </div>
              </div>
              <div className="task-actions">
                <select
                  className="status-select"
                  value={t.status}
                  onChange={e => onStatusChange(g.team.id, t.id, e.target.value)}
                >
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
                <button className="mini-btn" onClick={() => onEdit(g.team, t)}>Edit</button>
                <button className="mini-btn danger" onClick={() => onDelete(g.team, t)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}