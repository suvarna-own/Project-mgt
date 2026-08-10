import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Avatar } from './ui'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => navigate('/')} role="button" tabIndex={0}>
          <span className="brand-mark" aria-hidden />
          <div>
            <strong>Atlas</strong>
            <span>Project Management</span>
          </div>
        </div>
        <nav className="side-nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
        </nav>
        <div className="sidebar-footer">
          {user && (
            <div className="user-chip">
              <Avatar user={user} size={36} />
              <div>
                <strong>{user.full_name}</strong>
                <span>{user.job_title || user.email}</span>
              </div>
            </div>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="brand brand-lg">
          <span className="brand-mark" aria-hidden />
          <div>
            <strong>Atlas</strong>
            <span>Ship work with clarity</span>
          </div>
        </div>
        <Outlet />
      </div>
      <div className="auth-visual" aria-hidden>
        <div className="auth-orb auth-orb-a" />
        <div className="auth-orb auth-orb-b" />
        <p>Plan projects. Move tasks. Keep delivery honest.</p>
      </div>
    </div>
  )
}
