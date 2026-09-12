import { useState } from 'react'
import { useApp } from '../store'

export function Logo({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
      <path d="M4 17l6-11 6 11M8 13h4M14 6l6 11" />
    </svg>
  )
}

export default function Login() {
  const { login } = useApp()
  const [tab, setTab] = useState('team')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Enter a username and password.')
      return
    }
    if (!login(username, password, tab)) {
      setError('Incorrect username or password.')
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="mark" style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#F0299B,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Logo size={15} />
          </span>
          WebTech Roster
        </div>

        <div className="login-tabs">
          <button type="button" className={tab === 'team' ? 'active' : ''} onClick={() => { setTab('team'); setError('') }}>
            Team login
          </button>
          <button type="button" className={tab === 'admin' ? 'active' : ''} onClick={() => { setTab('admin'); setError('') }}>
            Admin login
          </button>
        </div>

        <div className="login-field">
          <label>Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            placeholder={tab === 'team' ? 'e.g. propmatch' : 'admin'} autoComplete="username" />
        </div>
        <div className="login-field">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete="current-password" />
        </div>
        {error && <div className="login-error" style={{ display: 'block' }}>{error}</div>}
        <button className="login-btn" type="submit">Log in</button>
      </form>
    </div>
  )
}