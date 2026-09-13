import { useRef, useState } from 'react'
import { useApp } from '../../store'
import { randomPass, cleanImported } from '../../utils'

export default function SettingsView({ requestConfirm }) {
  const { teams, updateTeams, setAdminPassword, resetData, toast, project } = useApp()
  const importRef = useRef(null)
  const [newPass, setNewPass] = useState('')

  const exportData = () => {
    const blob = new Blob([JSON.stringify(teams, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(project ? project.name : 'project').replace(/\s+/g, '-').toLowerCase()}-teams.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast('Roster exported.')
  }

  const onImportChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!Array.isArray(parsed)) throw new Error('not an array')
        const cleaned = cleanImported(parsed)
        if (cleaned.length === 0) {
          toast('That file has no valid teams.', 'error')
          return
        }
        requestConfirm(
          'Import this file?',
          `This replaces the current roster with ${cleaned.length} team(s) from the file.`,
          () => {
            updateTeams(cleaned)
            toast('Roster imported.')
          }
        )
      } catch (err) {
        console.error('Import error:', err)
        toast('Could not read that file — make sure it is valid JSON.', 'error')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleReset = () => {
    requestConfirm(
      'Reset to sample data?',
      'This replaces this project\u2019s roster, logins, and admin password with the built-in sample data. This cannot be undone.',
      () => {
        resetData()
        toast('Roster reset to sample data.')
      }
    )
  }

  const handleChangeAdminPassword = () => {
    const val = newPass.trim()
    if (!val) { toast('Enter a new password first.', 'error'); return }
    setAdminPassword(val)
    setNewPass('')
    toast('Admin password updated.')
  }

  const handleRegen = (t) => {
    requestConfirm(
      'Regenerate password?',
      `A new password will be created for "${t.project}". Their old password will stop working.`,
      () => {
        const next = teams.map(x => x.id === t.id ? { ...x, password: randomPass() } : x)
        updateTeams(next)
        const updated = next.find(x => x.id === t.id)
        toast(`New password for ${t.project}: ${updated.password}`)
      }
    )
  }

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <div className="page-sub">Manage the roster's data and logins</div>
        </div>
      </div>
      <div className="settings-grid">
        <div className="card">
          <div className="card-title"><div className="t">Data</div></div>
          <div className="setting-row">
            <div className="l">
              <div className="t2">Export roster</div>
              <div className="d">Download all teams as a JSON file.</div>
            </div>
            <button className="pill-btn" onClick={exportData}>Export</button>
          </div>
          <div className="setting-row">
            <div className="l">
              <div className="t2">Import roster</div>
              <div className="d">Replace current data with a JSON file.</div>
            </div>
            <button className="pill-btn" onClick={() => importRef.current && importRef.current.click()}>Import</button>
            <input ref={importRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onImportChange} />
          </div>
          <div className="setting-row">
            <div className="l">
              <div className="t2">Reset to sample data</div>
              <div className="d">Wipes changes and restores the original 4 teams and logins.</div>
            </div>
            <button className="btn-danger" onClick={handleReset}>Reset</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title"><div className="t">Admin password</div></div>
          <div className="field">
            <label>New password</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Leave blank to keep current" />
          </div>
          <button className="pill-btn" onClick={handleChangeAdminPassword}>Update password</button>
          <div className="card-title" style={{ marginTop: 22 }}><div className="t">About</div></div>
          <ul className="about-list">
            <li>Team accounts log in below and can edit <b>their own</b> project, description, members, and progress.</li>
            <li>This is a lightweight, client-side login for classroom use — not secure for sensitive data.</li>
          </ul>
        </div>

        <div className="card" style={{ gridColumn: '1/-1' }}>
          <div className="card-title"><div className="t">Team accounts</div></div>
          <table className="cred-table">
            <thead>
              <tr><th>Project</th><th>Username</th><th>Password</th><th></th></tr>
            </thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id}>
                  <td>{t.project}</td>
                  <td><code>{t.username}</code></td>
                  <td><code>{t.password}</code></td>
                  <td><button className="mini-btn" onClick={() => handleRegen(t)}>Regenerate password</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}