import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import {
  Avatar,
  StatusBadge,
  TASK_COLUMNS,
  formatDate,
  priorityKind,
  statusKind,
} from '../components/ui'
import type { Comment, Member, Task, TaskPriority, TaskStatus, TaskType } from '../types'

export function TaskDetailPage() {
  const { taskId } = useParams()
  const id = Number(taskId)
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const t = await api.task(id)
      const [c, m] = await Promise.all([api.comments(id), api.members(t.project_id)])
      setTask(t)
      setComments(c)
      setMembers(m)
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
      const c = await api.addComment(task.id, body.trim())
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

  if (loading) return <div className="page-loading">Loading task…</div>
  if (error && !task) return <div className="alert">{error}</div>
  if (!task) return null

  return (
    <div className="page task-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            <Link to={`/projects/${task.project_id}`}>Back to project</Link> / {task.issue_key}
          </p>
          <h1>{task.title}</h1>
          <div className="chip-row">
            <StatusBadge value={task.type} kind="neutral" />
            <StatusBadge value={task.status} kind={statusKind(task.status)} />
            <StatusBadge value={task.priority} kind={priorityKind(task.priority)} />
            {saving && <span className="muted">Saving…</span>}
          </div>
        </div>
        <button type="button" className="btn btn-danger" onClick={() => void onDelete()}>
          Delete
        </button>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="task-layout">
        <section className="panel">
          <h2>Description</h2>
          <textarea
            className="desc-editor"
            value={task.description || ''}
            onChange={(e) => setTask({ ...task, description: e.target.value })}
            onBlur={(e) => void patch({ description: e.target.value })}
            rows={8}
            placeholder="Add a description…"
          />

          <h2>Comments</h2>
          <ul className="comment-list">
            {comments.map((c) => (
              <li key={c.id}>
                <Avatar user={c.author} size={32} />
                <div>
                  <div className="comment-head">
                    <strong>{c.author.full_name}</strong>
                    <span className="muted">{formatDate(c.created_at)}</span>
                  </div>
                  <p>{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <form className="comment-form" onSubmit={onComment}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Leave a comment…"
              required
            />
            <button type="submit" className="btn btn-primary">
              Comment
            </button>
          </form>
        </section>

        <aside className="panel side-panel">
          <label>
            Title
            <input
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              onBlur={(e) => void patch({ title: e.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={task.status}
              onChange={(e) => void patch({ status: e.target.value as TaskStatus })}
            >
              {TASK_COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
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
          <label>
            Type
            <select
              value={task.type}
              onChange={(e) => void patch({ type: e.target.value as TaskType })}
            >
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="story">Story</option>
              <option value="epic">Epic</option>
            </select>
          </label>
          <label>
            Assignee
            <select
              value={task.assignee_id ?? ''}
              onChange={(e) =>
                void patch({ assignee_id: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.user.id}>
                  {m.user.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input
              type="date"
              value={task.due_date || ''}
              onChange={(e) => void patch({ due_date: e.target.value || null })}
            />
          </label>
          <label>
            Story points
            <input
              type="number"
              min={0}
              max={100}
              value={task.story_points ?? ''}
              onChange={(e) =>
                void patch({ story_points: e.target.value ? Number(e.target.value) : null })
              }
            />
          </label>
          <div className="side-meta">
            <div>
              <span>Reporter</span>
              <strong>{task.reporter.full_name}</strong>
            </div>
            <div>
              <span>Created</span>
              <strong>{formatDate(task.created_at)}</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>{formatDate(task.updated_at)}</strong>
            </div>
          </div>
          {task.labels.length > 0 && (
            <div className="chip-row">
              {task.labels.map((l) => (
                <span key={l.id} className="label-chip" style={{ background: l.color }}>
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
