import { useApp } from '../../store'
import { colorFor, initials, norm } from '../../utils'

export default function MembersView({ search }) {
  const { teams } = useApp()
  const q = norm(search)

  const people = teams.flatMap(t => [
    { name: t.leader, role: 'Leader', project: t.project, teamId: t.id },
    ...t.members.map(m => ({ name: m, role: 'Member', project: t.project, teamId: t.id })),
  ])
  const visible = people.filter(p =>
    !q || norm(p.name).includes(q) || norm(p.project).includes(q))

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <h1>Members</h1>
          <div className="page-sub">Every student on the roster, leaders and teammates</div>
        </div>
      </div>
      <div className="card">
        {people.length === 0 && <div className="empty">No members yet.</div>}
        {people.length > 0 && visible.length === 0 && <div className="empty">No matches for your search.</div>}
        {visible.map(p => (
          <div key={p.teamId + p.name + p.role} className="member-row">
            <div className="t-avatar" style={{ background: colorFor(p.teamId), width: 32, height: 32, fontSize: 11 }}>
              {initials(p.name)}
            </div>
            <div className="m-name">{p.name}</div>
            <span className={`role-pill ${p.role === 'Leader' ? 'leader' : 'member'}`}>{p.role}</span>
            <div className="m-proj">{p.project}</div>
          </div>
        ))}
      </div>
    </section>
  )
}