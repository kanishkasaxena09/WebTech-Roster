import { colorFor, initials, progressPct, teamSize, taskStats } from '../../utils'
import { PROGRESS_ITEMS } from '../../seed'

export default function DetailModal({ team, onClose, onEdit, onToggleProgress, onManageTasks }) {
  const pct = progressPct(team)
  const ts = taskStats(team)

  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="detail-head">
          <div className="t-avatar" style={{ background: colorFor(team.id), width: 50, height: 50, fontSize: 16 }}>
            {initials(team.leader)}
          </div>
          <div>
            <div className="detail-title">
              {team.project}
              {team.enabled === false && <span className="enabled-badge" style={{ marginLeft: 8 }}>Disabled</span>}
            </div>
            <div className="detail-sub">{teamSize(team)} members · {pct}% progress · login: {team.username}</div>
          </div>
        </div>
        {team.description
          ? <div className="detail-desc">{team.description}</div>
          : <div className="detail-desc muted">No description yet.</div>}
        <div className="detail-section">
          <div className="detail-label">Team leader</div>
          <span className="chip" style={{ borderColor: 'var(--pink)', color: 'var(--pink)' }}>{team.leader}</span>
        </div>
        <div className="detail-section">
          <div className="detail-label">Members</div>
          <div className="proj-chips">
            {team.members.map(m => <span key={m} className="chip">{m}</span>)}
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-label">Progress checklist <span className="hint">(click to toggle on this team's behalf)</span></div>
          <div className="bar-line" style={{ marginBottom: 10 }}><div className="fill" style={{ width: `${pct}%` }} /></div>
          <div className="progress-mini-grid">
            {PROGRESS_ITEMS.map(i => (
              <div
                key={i.key}
                className={`pm${team.progress[i.key] ? ' on' : ''} clickable`}
                onClick={() => onToggleProgress(team.id, i.key)}
              >
                {team.progress[i.key] ? '✓ ' : ''}{i.label}
              </div>
            ))}
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-label">Tasks ({ts.done}/{ts.total} done)</div>
          {(team.tasks || []).length === 0
            ? <div className="empty" style={{ padding: '8px 0' }}>No tasks yet.</div>
            : (team.tasks || []).slice(0, 5).map(t => (
              <div key={t.id} className="task-row" style={{ boxShadow: 'none', padding: '8px 0' }}>
                <div className="task-main">
                  <span className={`status-icon s-${t.status}`}>{t.status === 'done' ? '●' : t.status === 'in_progress' ? '◐' : '○'}</span>
                  <div className="task-body">
                    <span className="task-title">{t.title}</span>
                    <div className="task-sub">
                      <span className={`prio-badge ${t.priority || 'medium'}`}>{t.priority || 'medium'}</span>
                      {t.assignedTo && <span className="chip">{t.assignedTo}</span>}
                      {t.deadline && <span className="task-deadline">due {t.deadline}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button className="pill-btn" onClick={() => onManageTasks(team.id)}>Manage tasks</button>
          <button className="btn-primary" onClick={onEdit}>Edit team</button>
        </div>
      </div>
    </div>
  )
}