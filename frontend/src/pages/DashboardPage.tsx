import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Avatar, EmptyState, StatusBadge, formatDate, priorityKind, statusKind } from '../components/ui'
import type { Dashboard } from '../types'
import { useAuth } from '../context/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
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

  if (loading) return <div className="page-loading">Loading dashboard…</div>
  if (error) return <div className="alert">{error}</div>
  if (!data) return null

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Good day, {user?.full_name.split(' ')[0]}</h1>
          <p className="lede">Track delivery across your projects without drowning in noise.</p>
        </div>
        <Link className="btn btn-primary" to="/projects">
          View projects
        </Link>
      </header>

      <section className="stat-grid">
        <article className="stat">
          <span>Projects</span>
          <strong>{data.project_count}</strong>
        </article>
        <article className="stat">
          <span>Active</span>
          <strong>{data.active_projects}</strong>
        </article>
        <article className="stat">
          <span>My open tasks</span>
          <strong>{data.my_open_tasks}</strong>
        </article>
        <article className="stat">
          <span>Overdue</span>
          <strong className={data.overdue_tasks ? 'danger-text' : ''}>{data.overdue_tasks}</strong>
        </article>
      </section>

      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <h2>Recent projects</h2>
          </div>
          {data.recent_projects.length === 0 ? (
            <EmptyState title="No projects yet" body="Create your first project to start tracking work." />
          ) : (
            <ul className="project-list">
              {data.recent_projects.map((p) => (
                <li key={p.id}>
                  <Link to={`/projects/${p.id}`}>
                    <div className="project-key">{p.key}</div>
                    <div className="project-meta">
                      <strong>{p.name}</strong>
                      <span>
                        {p.stats?.completion_percent ?? 0}% complete · {p.stats?.member_count ?? 0} members
                      </span>
                    </div>
                    <StatusBadge value={p.status} kind={statusKind(p.status)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>My tasks</h2>
          </div>
          {data.my_tasks.length === 0 ? (
            <EmptyState title="Inbox clear" body="Nothing assigned to you right now." />
          ) : (
            <ul className="task-list">
              {data.my_tasks.map((t) => (
                <li key={t.id}>
                  <Link to={`/tasks/${t.id}`}>
                    <span className="issue-key">{t.issue_key}</span>
                    <strong>{t.title}</strong>
                    <div className="task-list-meta">
                      <StatusBadge value={t.status} kind={statusKind(t.status)} />
                      <StatusBadge value={t.priority} kind={priorityKind(t.priority)} />
                      <span className="muted">{formatDate(t.due_date)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Recent activity</h2>
        </div>
        {data.recent_activity.length === 0 ? (
          <EmptyState title="Quiet so far" body="Project activity will show up here." />
        ) : (
          <ul className="activity-list">
            {data.recent_activity.map((a) => (
              <li key={a.id}>
                {a.actor ? <Avatar user={a.actor} size={28} /> : <span className="avatar ghost" />}
                <div>
                  <p>{a.message}</p>
                  <span className="muted">
                    {a.actor?.full_name || 'System'} · {formatDate(a.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
