import { useState } from 'react'
import { useApp } from '../store'

const PROJECT_LABELS = { web: 'Web Tech', ml: 'Mini Project' }

export function Logo({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
      <path d="M4 17l6-11 6 11M8 13h4M14 6l6 11" />
    </svg>
  )
}

export default function Login() {
  const { projects, login, loginMain } = useApp()
  const [screen, setScreen] = useState('select')
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const projectLabel = (id) =>
    PROJECT_LABELS[id] || (projects.find(p => p.id === id) || {}).name || id

  const goSelect = () => { setScreen('select'); setError(''); setUsername(''); setPassword('') }
  const openScreen = (s) => { setScreen(s); setError(''); setUsername(''); setPassword('') }

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (!username || !password) { setError('Enter a username and password.'); return }
    let ok = false
    if (screen === 'main') {
      ok = loginMain(username, password)
    } else {
      if (!projectId) { setError('Select a project.'); return }
      ok = login(projectId, username, password, screen)
    }
    if (!ok) setError('Incorrect username or password for this account.')
  }

  const meta = { main: { icon: '👑', title: 'Main Admin' }, admin: { icon: '🛠', title: 'Project Admin' }, team: { icon: '👥', title: 'Team Member' } }

  return (
    <div className="lg-wrap">
      <div className="lg-orb lg-orb-1" />
      <div className="lg-orb lg-orb-2" />
      <div className="lg-orb lg-orb-3" />

      <div className="lg-card">
        <div className="lg-brand">
          <div className="lg-brand-logo"><Logo size={15} /></div>
          <div className="lg-brand-name">WebTech Roster</div>
          <div className="lg-brand-sub">Manage &bull; Build &bull; Grow</div>
        </div>

        {screen === 'select' ? (
          <>
            <div className="lg-title">Select Login</div>
            <div className="lg-options">
              {[
                { key: 'main',  icon: '👑', title: 'Main Admin',      desc: 'Website-level administration' },
                { key: 'admin', icon: '🛠', title: 'Project Admin',   desc: 'Web Tech / Mini Project administration' },
                { key: 'team',  icon: '👥', title: 'Team Member',     desc: 'Team member access' },
              ].map(o => (
                <button key={o.key} className="lg-option" type="button" onClick={() => openScreen(o.key)}>
                  <span className="lg-opt-icon">{o.icon}</span>
                  <span className="lg-opt-text">
                    <span className="lg-opt-title">{o.title}</span>
                    <span className="lg-opt-desc">{o.desc}</span>
                  </span>
                  <span className="lg-opt-arrow">&rarr;</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <form className="lg-form" onSubmit={submit}>
            <button type="button" className="lg-back" onClick={goSelect}>&larr; Back</button>
            <div className="lg-subheader">
              <span className="lg-sub-icon">{meta[screen].icon}</span>
              <span>{meta[screen].title}</span>
            </div>

            {screen !== 'main' && (
              <div className="lg-proj-select">
                {projects.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`lg-proj-btn${p.id === projectId ? ' active' : ''}`}
                    onClick={() => { setProjectId(p.id); setError('') }}
                  >
                    {projectLabel(p.id)}
                  </button>
                ))}
              </div>
            )}

            <div className="lg-field">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                placeholder={screen === 'main' ? 'mainadmin' : (screen === 'admin' ? 'admin username' : 'team username')}
              />
            </div>
            <div className="lg-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder={'••••••••'}
              />
            </div>

            {error && <div className="lg-error">{error}</div>}
            <button className="lg-btn" type="submit">Login</button>
          </form>
        )}
      </div>
    </div>
  )
}
