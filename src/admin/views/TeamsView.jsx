import { useApp } from '../../store'
import SyncNote from '../../components/SyncNote'
import { colorFor, initials, matchesSearch, teamSize } from '../../utils'

export default function TeamsView({ search, onAdd, onEdit, onDelete, onOpen, onToggle }) {
  const { teams, syncState, live } = useApp()
  const visible = teams.filter(t => matchesSearch(t, search))
  const totalPeople = teams.reduce((s, t) => s + teamSize(t), 0)
  const avgSize = teams.length ? (totalPeople / teams.length).toFixed(1) : '0'

  const maxSize = Math.max(...teams.map(teamSize), 1)
  const topIdx = teams.reduce((best, t, i) => (teamSize(t) > teamSize(teams[best]) ? i : best), 0)

  const leaderCount = teams.length
  const memberCount = teams.reduce((s, t) => s + t.members.length, 0)
  const total = leaderCount + memberCount || 1
  const leaderPct = Math.round((leaderCount / total) * 100)

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Team overview</h1>
          <div className="page-sub">Everyone's project team, at a glance</div>
        </div>
        <div className="head-actions">
          <div className="pill-btn">This semester</div>
          <button className="btn-primary" onClick={onAdd}>+ Add team</button>
        </div>
      </div>
      <SyncNote state={syncState} live={live} />

      <div className="row1">
        <div className="card">
          <div className="card-title">
            <div className="t">Team size</div>
            <div className="tabs"><span className="active">By team</span><span>By role</span></div>
          </div>
          <div className="stat-cols">
            <div className="stat-box">
              <div className="l">Total teams</div>
              <div className="v">{teams.length} <span className="tag">{teams.length} projects</span></div>
            </div>
            <div className="stat-box">
              <div className="l">Avg. team size</div>
              <div className="v">{avgSize} <span className="tag">{totalPeople} people</span></div>
            </div>
          </div>
          <div className="bars">
            {teams.length === 0
              ? <div className="empty" style={{ width: '100%' }}>No teams yet</div>
              : teams.map((t, i) => (
                <div key={t.id} className="bar-col">
                  <div className="bar-track">
                    <div className={`bar-fill${i === topIdx ? ' top' : ''}${t.enabled === false ? ' off' : ''}`}
                      style={{ height: `${(teamSize(t) / maxSize * 100).toFixed(0)}%` }} />
                  </div>
                  <div className="lbl">{t.project}</div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-title"><div className="t">Projects</div></div>
            <div className="plist">
              {teams.length === 0
                ? <div className="empty">No projects yet</div>
                : teams.map(t => {
                  const filled = Math.round((teamSize(t) / maxSize) * 10)
                  const dots = Array.from({ length: 10 }, (_, d) =>
                    <i key={d} className={d < filled ? 'on' : ''} />)
                  return (
                    <div key={t.id} className="prow">
                      <span className="dot" style={{ background: colorFor(t.id) }} />
                      <span className="name">{t.project}</span>
                      <div className="dots">{dots}</div>
                      <span className="pct">{teamSize(t)}</span>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="card">
            <div className="card-title"><div className="t">Roles</div></div>
            <div className="donut-wrap">
              <div className="donut"
                style={{ background: `conic-gradient(var(--pink) 0% ${leaderPct}%, var(--violet) ${leaderPct}% 100%)` }}>
                <div className="center"><div className="n">{leaderPct}%</div><div className="l">leaders</div></div>
              </div>
              <div className="legend">
                <div className="li"><span className="sw" style={{ background: 'var(--pink)' }} />Leaders<span className="val">{leaderCount}</span></div>
                <div className="li"><span className="sw" style={{ background: 'var(--violet)' }} />Members<span className="val">{memberCount}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row2">
        <div className="card">
          <div className="card-title"><div className="t">Teams</div></div>
          <div className="team-list">
            {visible.length === 0
              ? <div className="empty">{teams.length === 0 ? 'No teams yet. Click "+ Add team" to add the first one.' : 'No matches for your search.'}</div>
              : visible.map(t => (
                <div key={t.id} className="team-row">
                  <div className="team-row-main" onClick={() => onOpen(t.id)}>
                    <div className="t-avatar" style={{ background: colorFor(t.id) }}>{initials(t.leader)}</div>
                    <div className="t-info">
                      <div className="p">{t.project}{t.enabled === false && <span className="enabled-badge" style={{ marginLeft: 6 }}>Disabled</span>}</div>
                      <div className="s">{t.leader}</div>
                    </div>
                    <div className="bar-line"><div className="fill" style={{ width: `${(teamSize(t) / maxSize * 100).toFixed(0)}%` }} /></div>
                    <div className="t-count">{teamSize(t)} members</div>
                  </div>
                  <div className="t-actions">
                    {t.enabled === false
                      ? <button className="icon-btn" onClick={() => onToggle(t.id)}>enable</button>
                      : <button className="icon-btn" onClick={() => onToggle(t.id)}>disable</button>
                    }
                    <button className="icon-btn" onClick={() => onEdit(t.id)}>edit</button>
                    <button className="icon-btn danger" onClick={() => onDelete(t)}>delete</button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title"><div className="t">Leader vs. members</div></div>
          <div className="team-list">
            {visible.length === 0
              ? <div className="empty">{teams.length === 0 ? 'Nothing to show yet.' : 'No matches for your search.'}</div>
              : visible.map(t => {
                const size = teamSize(t)
                const lead = Math.round((1 / size) * 100)
                return (
                  <div key={t.id} className="team-row" style={{ cursor: 'pointer' }} onClick={() => onOpen(t.id)}>
                    <div className="t-avatar" style={{ background: colorFor(t.id) }}>{initials(t.leader)}</div>
                    <div className="t-info">
                      <div className="p">{t.leader}</div>
                      <div className="s">{t.project}</div>
                    </div>
                    <div className="split-bar">
                      <div className="lead" style={{ width: `${lead}%` }} />
                      <div className="mem" style={{ width: `${100 - lead}%` }} />
                    </div>
                    <div className="t-count">{lead}% lead</div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
      <footer>synced from shared storage · compiled from Web_Tech_5th_sem.csv</footer>
    </section>
  )
}