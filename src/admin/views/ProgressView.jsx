import { useApp } from '../../store'
import { colorFor, initials, progressPct } from '../../utils'
import { PROGRESS_ITEMS } from '../../seed'

export default function ProgressView({ onOpen }) {
  const { teams } = useApp()

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Progress</h1>
          <div className="page-sub">What every team has checked off, updated live by each team</div>
        </div>
      </div>
      <div id="progressAdminList">
        {teams.length === 0 && <div className="card"><div className="empty">No teams yet.</div></div>}
        {teams.map(t => {
          const pct = progressPct(t)
          return (
            <div key={t.id} className="card" style={{ cursor: 'pointer' }} onClick={() => onOpen(t.id)}>
              <div className="card-title">
                <div className="t">
                  <div className="t-avatar" style={{ background: colorFor(t.id), width: 28, height: 28, fontSize: '10.5px' }}>
                    {initials(t.leader)}
                  </div>
                  &nbsp;{t.project}
                </div>
                <div className="proj-badge">{pct}% complete</div>
              </div>
              <div className="bar-line" style={{ marginBottom: 14 }}>
                <div className="fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="progress-mini-grid">
                {PROGRESS_ITEMS.map(i => (
                  <div key={i.key} className={`pm${t.progress[i.key] ? ' on' : ''}`}>
                    {t.progress[i.key] ? '✓ ' : ''}{i.label}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}