import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import {
  Avatar,
  EmptyState,
  Modal,
  StatusBadge,
  TASK_COLUMNS,
  formatBudget,
  formatDate,
  priorityKind,
  statusKind,
} from '../components/ui'
import type {
  Activity,
  Label,
  Member,
  MemberRole,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../types'

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [tab, setTab] = useState<'board' | 'list' | 'members' | 'activity'>('board')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [taskOpen, setTaskOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, t, m, l, a] = await Promise.all([
        api.project(id),
        api.tasks(id),
        api.members(id),
        api.labels(id),
        api.activity(id),
      ])
      setProject(p)
      setTasks(t)
      setMembers(m)
      setLabels(l)
      setActivity(a)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!query.trim()) return tasks
    const q = query.toLowerCase()
    return tasks.filter(
      (t) => t.title.toLowerCase().includes(q) || String(t.number).includes(q) || t.issue_key?.toLowerCase().includes(q),
    )
  }, [tasks, query])

  async function onMove(task: Task, status: TaskStatus) {
    if (task.status === status) return
    const optimistic = tasks.map((t) => (t.id === task.id ? { ...t, status } : t))
    setTasks(optimistic)
    try {
      const updated = await api.moveTask(task.id, { status, position: 0 })
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move failed')
      void load()
    }
  }

  if (loading) return <div className="page-loading">Loading project…</div>
  if (error && !project) return <div className="alert">{error}</div>
  if (!project) return null

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            <Link to="/projects">Projects</Link> / {project.key}
          </p>
          <h1>{project.name}</h1>
          <p className="lede">{project.description}</p>
          <div className="chip-row">
            <StatusBadge value={project.status} kind={statusKind(project.status)} />
            <StatusBadge value={project.priority} kind={priorityKind(project.priority)} />
            <span className="meta-pill">Target {formatDate(project.target_date)}</span>
            <span className="meta-pill">{formatBudget(project.budget)}</span>
            <span className="meta-pill">{project.stats?.completion_percent ?? 0}% complete</span>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setMemberOpen(true)}>
            Invite
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setTaskOpen(true)}>
            New task
          </button>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="tabs">
        {(['board', 'list', 'members', 'activity'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        <input
          className="search"
          placeholder="Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {tab === 'board' && (
        <div className="board">
          {TASK_COLUMNS.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.id)
            return (
              <section
                key={col.id}
                className="board-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const taskId = Number(e.dataTransfer.getData('text/task-id'))
                  const task = tasks.find((t) => t.id === taskId)
                  if (task) void onMove(task, col.id)
                }}
              >
                <header>
                  <h3>{col.label}</h3>
                  <span>{colTasks.length}</span>
                </header>
                <div className="board-stack">
                  {colTasks.map((task) => (
                    <article
                      key={task.id}
                      className="task-card"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/task-id', String(task.id))}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <div className="task-card-top">
                        <span className="issue-key">{task.issue_key}</span>
                        <StatusBadge value={task.priority} kind={priorityKind(task.priority)} />
                      </div>
                      <strong>{task.title}</strong>
                      <div className="task-card-foot">
                        <span className="type-tag">{task.type}</span>
                        {task.labels.slice(0, 2).map((l) => (
                          <span key={l.id} className="label-chip" style={{ background: l.color }}>
                            {l.name}
                          </span>
                        ))}
                        {task.assignee && <Avatar user={task.assignee} size={24} />}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          {filtered.length === 0 ? (
            <EmptyState title="No tasks" body="Create a task or clear your search." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} onClick={() => navigate(`/tasks/${t.id}`)}>
                    <td className="issue-key">{t.issue_key}</td>
                    <td>{t.title}</td>
                    <td>
                      <StatusBadge value={t.status} kind={statusKind(t.status)} />
                    </td>
                    <td>
                      <StatusBadge value={t.priority} kind={priorityKind(t.priority)} />
                    </td>
                    <td>{t.assignee ? t.assignee.full_name : 'Unassigned'}</td>
                    <td>{formatDate(t.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="panel">
          <ul className="member-list">
            {members.map((m) => (
              <li key={m.id}>
                <Avatar user={m.user} size={40} />
                <div>
                  <strong>{m.user.full_name}</strong>
                  <span className="muted">
                    {m.user.email} · {m.user.job_title || 'Teammate'}
                  </span>
                </div>
                <StatusBadge value={m.role} kind="info" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'activity' && (
        <div className="panel">
          <ul className="activity-list">
            {activity.map((a) => (
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
        </div>
      )}

      <CreateTaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        projectId={id}
        members={members}
        labels={labels}
        onCreated={() => {
          setTaskOpen(false)
          void load()
        }}
      />
      <InviteMemberModal
        open={memberOpen}
        onClose={() => setMemberOpen(false)}
        projectId={id}
        onCreated={() => {
          setMemberOpen(false)
          void load()
        }}
      />
    </div>
  )
}

function CreateTaskModal({
  open,
  onClose,
  projectId,
  members,
  labels,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  members: Member[]
  labels: Label[]
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [type, setType] = useState<TaskType>('task')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [points, setPoints] = useState('')
  const [labelIds, setLabelIds] = useState<number[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.createTask(projectId, {
        title,
        description: description || undefined,
        status,
        priority,
        type,
        assignee_id: assigneeId ? Number(assigneeId) : null,
        due_date: dueDate || null,
        story_points: points ? Number(points) : null,
        label_ids: labelIds,
      })
      setTitle('')
      setDescription('')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create task')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="New task" onClose={onClose} wide>
      <form className="form-grid" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        <label className="full">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="full">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as TaskType)}>
            <option value="task">Task</option>
            <option value="bug">Bug</option>
            <option value="story">Story</option>
            <option value="epic">Epic</option>
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {TASK_COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            <option value="lowest">Lowest</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="highest">Highest</option>
          </select>
        </label>
        <label>
          Assignee
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
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
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label>
          Story points
          <input type="number" min={0} max={100} value={points} onChange={(e) => setPoints(e.target.value)} />
        </label>
        <fieldset className="full label-picker">
          <legend>Labels</legend>
          {labels.map((l) => (
            <label key={l.id} className="check">
              <input
                type="checkbox"
                checked={labelIds.includes(l.id)}
                onChange={(e) =>
                  setLabelIds((prev) =>
                    e.target.checked ? [...prev, l.id] : prev.filter((x) => x !== l.id),
                  )
                }
              />
              <span className="label-chip" style={{ background: l.color }}>
                {l.name}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="form-actions full">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function InviteMemberModal({
  open,
  onClose,
  projectId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  onCreated: () => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('member')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.addMember(projectId, { email, role })
      setEmail('')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Invite member" onClose={onClose}>
      <form className="form-grid" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        <label className="full">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="full">
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
        <p className="muted full">User must already have an Atlas account (try sam@atlas.dev).</p>
        <div className="form-actions full">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Inviting…' : 'Invite'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
