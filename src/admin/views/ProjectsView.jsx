import { useApp } from '../../store'
import { matchesSearch, progressPct, teamSize } from '../../utils'

export default function ProjectsView({ search, onAdd, onEdit, onDelete, onOpen }) {
  const { teams } = useApp()
  const visible = teams.filter(t => matchesSearch(t, search))

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <div className="page-sub">One card per team project, with live progress</div>
        </div>
        <div className="head-actions">
          <button className="btn-primary" onClick={onAdd}>+ Add team</button>
        </div>
      </div>
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