import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import {
  Alert,
  Badge,
  PageLoader,
  TASK_COLUMNS,
  btnPrimary,
  formatDate,
  inputClass,
} from '../components/ui'
import type { Comment, Task, TaskPriority, TaskStatus, TaskType, TeamMember } from '../types'

export function TaskDetailPage() {
  const { taskId } = useParams()
  const id = Number(taskId)
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [body, setBody] = useState('')
  const [authorName, setAuthorName] = useState('Anonymous')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const t = await api.task(id)
      const [c, tm] = await Promise.all([api.comments(id), api.teamMembers()])
      setTask(t)
      setComments(c)
      setTeam(tm)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function patch(partial: Record<string, unknown>) {
    if (!task) return
    setSaving(true)
    try {
      const updated = await api.updateTask(task.id, partial)
      setTask(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function onComment(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || !task) return
    try {
      const c = await api.addComment(task.id, body.trim(), authorName.trim() || 'Anonymous')
      setComments((prev) => [...prev, c])
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment failed')
    }
  }

  async function onDelete() {
    if (!task || !confirm('Delete this task?')) return
    await api.deleteTask(task.id)
    navigate(`/projects/${task.project_id}`)
  }

  if (loading) return <PageLoader label="Loading task…" />
  if (error && !task) return <div className="p-8"><Alert>{error}</Alert></div>
  if (!task) return null

  return (
    <div className="p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            <Link to={`/projects/${task.project_id}`} className="text-teal-600 hover:underline">
              Back to project
            </Link>{' '}
            / {task.issue_key}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{task.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge value={task.type} />
            <Badge value={task.status} />
            <Badge value={task.priority} />
            {saving && <span className="text-sm text-slate-500">Saving…</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onDelete()}
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
        >
          Delete
        </button>
      </header>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">Description</h2>
            <textarea
              className={`${inputClass} min-h-[160px]`}
              value={task.description || ''}
              onChange={(e) => setTask({ ...task, description: e.target.value })}
              onBlur={(e) => void patch({ description: e.target.value })}
              placeholder="Add a description…"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Comments</h2>
            <ul className="mb-4 space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg bg-slate-50 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <strong className="text-sm text-slate-900">{c.author_name}</strong>
                    <span className="text-xs text-slate-500">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{c.body}</p>
                </li>
              ))}
            </ul>
            <form onSubmit={onComment} className="space-y-3">
              <input
                className={inputClass}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name"
              />
              <textarea
                className={inputClass}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Leave a comment…"
                required
              />
              <button type="submit" className={btnPrimary}>Comment</button>
            </form>
          </div>
        </section>

        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">
            Title
            <input
              className={inputClass}
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              onBlur={(e) => void patch({ title: e.target.value })}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Status
            <select
              className={inputClass}
              value={task.status}
              onChange={(e) => void patch({ status: e.target.value as TaskStatus })}
            >
              {TASK_COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Priority
            <select
              className={inputClass}
              value={task.priority}
              onChange={(e) => void patch({ priority: e.target.value as TaskPriority })}
            >
              <option value="lowest">Lowest</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="highest">Highest</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Type
            <select
              className={inputClass}
              value={task.type}
              onChange={(e) => void patch({ type: e.target.value as TaskType })}
            >
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="story">Story</option>
              <option value="epic">Epic</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Assignee
            <select
              className={inputClass}
              value={task.assignee_id ?? ''}
              onChange={(e) =>
                void patch({ assignee_id: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">Unassigned</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Due date
            <input
              type="date"
              className={inputClass}
              value={task.due_date || ''}
              onChange={(e) => void patch({ due_date: e.target.value || null })}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Story points
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={task.story_points ?? ''}
              onChange={(e) =>
                void patch({ story_points: e.target.value ? Number(e.target.value) : null })
              }
            />
          </label>
          <div className="border-t border-slate-100 pt-4 text-sm text-slate-500">
            <p>Created {formatDate(task.created_at)}</p>
            <p>Updated {formatDate(task.updated_at)}</p>
          </div>
          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {task.labels.map((l) => (
                <span key={l.id} className="rounded px-2 py-0.5 text-xs text-white" style={{ background: l.color }}>
                  {l.name}
                </span>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
