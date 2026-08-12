import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Alert, Badge, EmptyState, PageLoader, btnPrimary, formatDate } from '../components/ui'
import type { Dashboard } from '../types'

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        debugger
        const d = await api.dashboard()
        if (alive) setData(d)
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <PageLoader label="Loading dashboard…" />
  if (error) return <div className="p-8"><Alert>{error}</Alert></div>
  if (!data) return null

  return (
    <div className="p-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-teal-600">Workspace</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-600">Track projects and open work at a glance.</p>
        </div>
        <Link to="/projects" className={btnPrimary}>
          View projects
        </Link>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Projects', value: data.project_count },
          { label: 'Active', value: data.active_projects },
          { label: 'Open tasks', value: data.open_tasks },
          { label: 'Overdue', value: data.overdue_tasks, danger: data.overdue_tasks > 0 },
        ].map((stat) => (
          <article
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p
              className={`mt-1 text-3xl font-bold ${stat.danger ? 'text-rose-600' : 'text-slate-900'}`}
            >
              {stat.value}
            </p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent projects</h2>
          </div>
          <div className="p-5">
            {data.recent_projects.length === 0 ? (
              <EmptyState title="No projects yet" body="Create your first project to get started." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recent_projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/projects/${p.id}`}
                      className="flex items-center gap-4 py-3 transition-colors hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-800">
                        {p.key}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="text-sm text-slate-500">
                          {p.stats?.completion_percent ?? 0}% complete
                        </p>
                      </div>
                      <Badge value={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Open tasks</h2>
          </div>
          <div className="p-5">
            {data.recent_tasks.length === 0 ? (
              <EmptyState title="All clear" body="No open tasks right now." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recent_tasks.map((t) => (
                  <li key={t.id}>
                    <Link
                      to={`/tasks/${t.id}`}
                      className="block py-3 transition-colors hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-teal-700">{t.issue_key}</span>
                        <Badge value={t.status} />
                      </div>
                      <p className="mt-1 font-medium text-slate-900">{t.title}</p>
                      <p className="text-sm text-slate-500">Due {formatDate(t.due_date)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Recent activity</h2>
        </div>
        <div className="p-5">
          {data.recent_activity.length === 0 ? (
            <EmptyState title="Quiet so far" body="Activity will appear here." />
          ) : (
            <ul className="space-y-3">
              {data.recent_activity.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                  <div>
                    <p className="text-slate-800">{a.message}</p>
                    <p className="text-slate-500">
                      {a.actor_name || 'System'} · {formatDate(a.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
