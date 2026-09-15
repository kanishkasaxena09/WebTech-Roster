import { useState } from 'react'
import { PROGRESS_STATUSES } from '../../utils'

export default function ProjectModal({ project, onClose, onSave }) {
  const [name, setName] = useState(project ? project.name : '')
  const [description, setDescription] = useState(project ? (project.description || '') : '')
  const [status, setStatus] = useState(project ? (project.status === 'archived' ? 'archived' : 'active') : 'active')
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) { setError('Project name is required.'); return }
    onSave({ name: name.trim(), description: description.trim(), status })
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal">
        <h3>Edit project</h3>
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Web Tech" />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional short description" />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {PROGRESS_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <div className="hint">Archived projects keep their data and team logins, but are marked as finished.</div>
        </div>
        {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save project</button>
        </div>
      </div>
    </div>
  )
}