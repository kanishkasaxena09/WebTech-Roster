import { useApp } from '../../store'
import SyncNote from '../../components/SyncNote'
import TreeView from '../components/TreeView'
import { projectProgressPct, taskStats, memberNames } from '../../utils'

export default function OverviewView({ onOpenTeam, onGoProjects, onGoTasks, onAddTeam }) {
  const { teams, project, syncState, live, session } = useApp()
  const tasks = taskStats(teams)
  const members = teams.reduce((s, t) => s + memberNames(t).length, 0)
  const overall = projectProgressPct(teams)

  const statCards = [
    { l: 'Teams', v: teams.length, sub: 'sub-projects in this project' },
    { l: 'Members', v: members, sub: 'leaders and teammates' },
    { l: 'Active tasks', v: tasks.active, sub: 'not yet marked done' },
    { l: 'Completed tasks', v: tasks.done, sub: `${tasks.total} total task(s)` },
    { l: 'Overall progress', v: overall + '%', sub: 'across all teams' },
  ]

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <div className="page-sub">
            {project ? project.name : 'Project'} — {project && project.description ? project.description : 'control center for your project and teams'}
          </div>
        </div>
        <div className="head-actions">
          <span className={`status-badge ${project && project.status === 'archived' ? 'archived' : 'active'}`}>
            {project && project.status === 'archived' ? 'Archived' : 'Active'}
          </span>
        </div>
      </div>
      <SyncNote state={syncState} live={live} />

      <div className="stat-grid">
        {statCards.map(s => (
          <div key={s.l} className="stat-card">
            <div className="l">{s.l}</div>
            <div className="n">{s.v}</div>
            <div className="sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {project && project.status === 'archived' && (
        <div className="notice">This project is archived. Teams still keep their logins, and you can un-archive it from the Projects view at any time.</div>
      )}

      <div className="overview-grid">
        <div className="card">
          <div className="card-title"><div className="t">Project tree</div><div className="page-sub-sm">Click a team row to inspect it</div></div>
          <TreeView
            adminName={session ? (project ? project.name + ' Admin' : 'Admin') : 'Admin'}
            project={project}
            teams={teams}
            onOpenTeam={onOpenTeam}
            onGoProjects={onGoProjects}
            onGoTasks={onGoTasks}
          />
        </div>

        <div className="card">
          <div className="card-title"><div className="t">Quick actions</div></div>
          <div className="quick-actions">
            <button className="pill-btn" onClick={onGoProjects}>Manage projects</button>
            <button className="pill-btn" onClick={() => onGoTasks()}>Manage tasks</button>
            <button className="pill-btn" onClick={onAddTeam}>+ Add team</button>
          </div>
          <div className="card-title" style={{ marginTop: 20 }}><div className="t">At a glance</div></div>
          <div className="task-stats">
            <div className="ts"><span className="ts-dot" style={{ background: 'var(--pink)' }} />To do</div>
            <div className="ts"><span className="ts-dot" style={{ background: 'var(--violet)' }} />In progress</div>
            <div className="ts"><span className="ts-dot" style={{ background: 'var(--green)' }} />Done</div>
          </div>
        </div>
      </div>

      <footer>synced from shared storage · compiled from Web_Tech_5th_sem.csv</footer>
    </section>
  )
}