import { useState } from 'react'
import { TASK_STATUSES, TASK_PRIORITIES, memberNames, norm } from '../../utils'

export default function TaskModal({ teams, teamId, task, onClose, onSave }) {
  const initialTeamId = teamId || (teams[0] && teams[0].id) || ''
  const [selTeamId, setSelTeamId] = useState(initialTeamId)
  const [title, setTitle] = useState(task ? task.title : '')
  const [description, setDescription] = useState(task ? (task.description || '') : '')
  const [status, setStatus] = useState(task ? task.status : 'todo')
  const [priority, setPriority] = useState(task ? task.priority : 'medium')
  const [assignedTo, setAssignedTo] = useState(task ? (task.assignedTo || '') : '')
  const [deadline, setDeadline] = useState(task ? (task.deadline || '') : '')
  const [progress, setProgress] = useState(task ? (Number(task.progress) || 0) : 0)
  const [error, setError] = useState('')

  const team = teams.find(t => t.id === selTeamId)
  const assignees = team ? memberNames(team) : []

  const submit = () => {
    const p = norm(title)
    if (!p) { setError('Task title is required.'); return }
    if (!selTeamId) { setError('Choose a team for this task.'); return }
    onSave({
      id: task ? task.id : undefined,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignedTo: assignedTo.trim(),
      deadline: deadline.trim(),
      progress: status === 'done' ? 100 : progress,
      createdAt: task ? task.createdAt : Date.now(),
      teamId: selTeamId,
    })
  }

  return (
    <div className="overlay open" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h3>{task ? 'Edit task' : 'Add task'}</h3>
        <div className="field">
          <label>Team</label>
          <select value={selTeamId} onChange={e => setSelTeamId(e.target.value)}>
            {teams.map(t => <option key={t.id} value={t.id}>{t.project}{!t.enabled ? ' · disabled' : ''}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Build login screen" />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details" />
        </div>
        <div className="task-grid-fields">
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {TASK_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              {TASK_PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Assigned to</label>
            <input list="task-assignees" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Team member" />
            <datalist id="task-assignees">
              {assignees.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div className="field">
            <label>Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Progress — {status === 'done' ? 100 : progress}%</label>
          <input type="range" min="0" max="100" step="5"
            value={status === 'done' ? 100 : progress}
            onChange={e => setProgress(Number(e.target.value))} />
        </div>
        {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save task</button>
        </div>
      </div>
    </div>
  )
}