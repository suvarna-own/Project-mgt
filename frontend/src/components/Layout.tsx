import { NavLink, Outlet } from 'react-router-dom'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-lg font-bold text-white">
              P
            </span>
            <div>
              <p className="font-semibold text-slate-900">Planboard</p>
              <p className="text-xs text-slate-500">Project Management</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <NavLink to="/" end className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={navClass}>
            Projects
          </NavLink>
        </nav>
        <div className="border-t border-slate-200 p-4 text-xs text-slate-400">
          No login required — open access workspace
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
