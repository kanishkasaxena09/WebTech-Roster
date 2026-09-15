import { useState } from 'react'
import { colorFor, initials, teamProgressPct } from '../../utils'

export default function TreeView({ adminName, project, teams, onOpenTeam, onGoProjects, onGoTasks }) {
  const [open, setOpen] = useState({})
  const toggle = (id) => setOpen(o => ({ ...o, [id]: !o[id] }))
  const isOpen = (id) => !!open[id]

  const projectNode = (
    <div className="tree-node">
      <div className={`tree-row type-project${isOpen('project') ? ' open' : ''}`} onClick={() => toggle('project')}>
        <span className="tree-chevron">{isOpen('project') ? '▾' : '▸'}</span>
        <span className="tree-icon" style={{ background: 'rgba(139,92,246,0.18)' }}>P</span>
        <span className="tree-label">{project ? project.name : 'Project'}</span>
        <span className={`status-badge ${project && project.status === 'archived' ? 'archived' : 'active'}`}>
          {project && project.status === 'archived' ? 'Archived' : 'Active'}
        </span>
        {project && project.status === 'archived' && (
          <button className="tree-link" onClick={(e) => { e.stopPropagation(); onGoProjects() }}>Restore</button>
        )}
      </div>
      {isOpen('project') && (
        <div className="tree-children">
          {teams.length === 0 && <div className="tree-row empty-row">No teams in this project yet.</div>}
          {teams.map(t => (
            <div key={t.id} className="tree-node">
              <div className={`tree-row type-team${isOpen(t.id) ? ' open' : ''}`} onClick={() => toggle(t.id)}>
                <span className="tree-chevron">{isOpen(t.id) ? '▾' : '▸'}</span>
                <span className="tree-avatar" style={{ background: colorFor(t.id) }}>{initials(t.leader)}</span>
                <span className="tree-label">{t.project}</span>
                {!t.enabled && <span className="enabled-badge">Disabled</span>}
                <span className="tree-meta">{teamProgressPct(t)}%</span>
                <div className="tree-bar"><div className="fill" style={{ width: `${teamProgressPct(t)}%` }} /></div>
                <button className="tree-link" onClick={(e) => { e.stopPropagation(); onOpenTeam(t.id) }}>Open</button>
                <button className="tree-link" onClick={(e) => { e.stopPropagation(); onGoTasks(t.id) }}>Tasks</button>
              </div>
              {isOpen(t.id) && (
                <div className="tree-children">
                  {[t.leader, ...(t.members || [])].map(name => (
                    <div key={name} className="tree-row type-member">
                      <span className="tree-leaf">•</span>
                      <span className="tree-label">{name}</span>
                      <span className="tree-meta">{name === t.leader ? 'Leader' : 'Member'}</span>
                    </div>
                  ))}
                  <div className="tree-row type-member" style={{ color: 'var(--muted)' }}>
                    <span className="tree-leaf">#</span>
                    <span className="tree-label">{(t.tasks || []).length} task(s)</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="tree">
      <div className="tree-node">
        <div className={`tree-row type-admin${isOpen('root') ? ' open' : ''}`} onClick={() => toggle('root')}>
          <span className="tree-chevron">{isOpen('root') ? '▾' : '▸'}</span>
          <span className="tree-icon" style={{ background: 'var(--pink)' }}>A</span>
          <span className="tree-label"><b>{adminName}</b> (Admin)</span>
        </div>
        {isOpen('root') && (
          <div className="tree-children">
            {projectNode}
          </div>
        )}
      </div>
    </div>
  )
}