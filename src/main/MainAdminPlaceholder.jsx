import { useApp } from '../store'
import { Logo } from '../components/Login'

// Stage 1 placeholder only. The full Main Admin dashboard is Stage 2+.
export default function MainAdminPlaceholder() {
  const { logout, admins } = useApp()
  const main = admins && admins.main ? admins.main : null

  return (
    <>
      <div className="topbar">
        <div className="brand"><span className="mark"><Logo size={14} /></span>WebTech Roster</div>
        <div className="topbar-right">
          <div className="user">
            <div className="avatar" style={{ background: 'linear-gradient(135deg,#F0299B,#8B5CF6)' }}>M</div>
            <div>
              <div className="name">Main Admin</div>
              <div className="sub">{main ? main.name : 'Website Admin'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      </div>
      <div className="team-main">
        <div className="page-head">
          <div>
            <h1>Main Admin</h1>
            <div className="page-sub">Website-level access is enabled. The full dashboard ships in a later stage.</div>
          </div>
        </div>
        <div className="card">
          <div className="card-title"><div className="t">Stage 1 — foundation ready</div></div>
          <div className="empty">Role, authorization, and data model are in place. Main Admin UI is not built yet.</div>
        </div>
      </div>
    </>
  )
}