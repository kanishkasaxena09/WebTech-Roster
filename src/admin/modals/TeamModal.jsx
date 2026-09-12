import { useState } from 'react'
import { norm, dedupeMembers } from '../../utils'

export default function TeamModal({ team, teams, onClose, onSave }) {
  const [project, setProject] = useState(team ? team.project : '')
  const [description, setDescription] = useState(team ? (team.description || '') : '')
  const [leader, setLeader] = useState(team ? team.leader : '')
  const [membersRaw, setMembersRaw] = useState(team ? team.members.join(', ') : '')
  const [error, setError] = useState('')

  const submit = () => {
    const p = project.trim()
    const d = description.trim()
    const l = leader.trim()
    const members = dedupeMembers(l, membersRaw)
    if (!p || !l) { setError('Project name and team leader are required.'); return }
    if (members.length < 1) { setError('Add at least one member besides the leader.'); return }
    const clash = teams.some(t => t.id !== (team && team.id) && norm(t.project) === norm(p))
    if (clash) { setError(`A team is already working on "${p}". Project names must be unique.`); return }
    onSave({ project: p, description: d, leader: l, members })
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal">
        <h3>{team ? 'Edit team' : 'Add team'}</h3>
        <div className="field">
          <label>Project name</label>
          <input value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. PropMatch" />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional short description" />
        </div>
        <div className="field">
          <label>Team leader</label>
          <input value={leader} onChange={e => setLeader(e.target.value)} placeholder="e.g. Sudhanshu Mathur" />
        </div>
        <div className="field">
          <label>Other members</label>
          <input value={membersRaw} onChange={e => setMembersRaw(e.target.value)} placeholder="comma-separated, e.g. Vishal, Suryansh" />
          <div className="hint">Separate names with commas. At least 1 required, besides the leader.</div>
        </div>
        {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  )
}