import { colorFor, initials, progressPct, teamSize } from '../../utils'
import { PROGRESS_ITEMS } from '../../seed'

export default function DetailModal({ team, onClose, onEdit }) {
  const pct = progressPct(team)

  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="detail-head">
          <div className="t-avatar" style={{ background: colorFor(team.id), width: 50, height: 50, fontSize: 16 }}>
            {initials(team.leader)}
          </div>
          <div>
            <div className="detail-title">{team.project}</div>
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
          <div className="detail-label">Progress checklist</div>
          <div className="bar-line" style={{ marginBottom: 10 }}><div className="fill" style={{ width: `${pct}%` }} /></div>
          <div className="progress-mini-grid">
            {PROGRESS_ITEMS.map(i => (
              <div key={i.key} className={`pm${team.progress[i.key] ? ' on' : ''}`}>
                {team.progress[i.key] ? '✓ ' : ''}{i.label}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={onEdit}>Edit team</button>
        </div>
      </div>
    </div>
  )
}