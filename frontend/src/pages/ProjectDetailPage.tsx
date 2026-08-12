import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import {
  Alert,
  Avatar,
  Badge,
  EmptyState,
  Modal,
  PageLoader,
  TASK_COLUMNS,
  btnPrimary,
  btnSecondary,
  formatBudget,
  formatDate,
  inputClass,
} from '../components/ui'
import type { Activity, Label, Project, Task, TaskPriority, TaskStatus, TaskType, TeamMember } from '../types'

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [tab, setTab] = useState<'board' | 'list' | 'activity'>('board')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [taskOpen, setTaskOpen] = useState(false)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, t, tm, l, a] = await Promise.all([
        api.project(id),
        api.tasks(id),
        api.teamMembers(),
        api.labels(id),
        api.activity(id),
      ])
      setProject(p)
      setTasks(t)
      setTeam(tm)
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
      (t) =>
        t.title.toLowerCase().includes(q) ||
        String(t.number).includes(q) ||
        t.issue_key?.toLowerCase().includes(q),
    )
  }, [tasks, query])

  async function onMove(task: Task, status: TaskStatus) {
    if (task.status === status) return
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)))
    try {
      const updated = await api.moveTask(task.id, { status, position: 0 })
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move failed')
      void load()
    }
  }

  if (loading) return <PageLoader label="Loading project…" />
  if (error && !project) return <div className="p-8"><Alert>{error}</Alert></div>
  if (!project) return null

  return (
    <div className="p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            <Link to="/projects" className="text-teal-600 hover:underline">Projects</Link> / {project.key}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{project.name}</h1>
          <p className="mt-2 max-w-2xl text-slate-600">{project.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge value={project.status} />
            <Badge value={project.priority} />
            <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs text-slate-600">
              Target {formatDate(project.target_date)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs text-slate-600">
              {formatBudget(project.budget)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs text-slate-600">
              {project.stats?.completion_percent ?? 0}% complete
            </span>
          </div>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setTaskOpen(true)}>
          New task
        </button>
      </header>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        {(['board', 'list', 'activity'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'bg-teal-100 text-teal-800' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
        <input
          className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {tab === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TASK_COLUMNS.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.id)
            return (
              <section
                key={col.id}
                className="w-72 shrink-0 rounded-xl bg-slate-100/80 p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const taskId = Number(e.dataTransfer.getData('text/task-id'))
                  const task = tasks.find((t) => t.id === taskId)
                  if (task) void onMove(task, col.id)
                }}
              >
                <header className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
                    {colTasks.length}
                  </span>
                </header>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/task-id', String(task.id))}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-mono text-teal-700">{task.issue_key}</span>
                        <Badge value={task.priority} />
                      </div>
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs capitalize text-slate-500">{task.type}</span>
                        {task.assignee && <Avatar member={task.assignee} size={24} />}
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {filtered.length === 0 ? (
            <div className="p-6"><EmptyState title="No tasks" body="Create a task or clear your search." /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-mono text-teal-700">{t.issue_key}</td>
                    <td className="px-4 py-3">{t.title}</td>
                    <td className="px-4 py-3"><Badge value={t.status} /></td>
                    <td className="px-4 py-3"><Badge value={t.priority} /></td>
                    <td className="px-4 py-3">{t.assignee?.full_name || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(t.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <ul className="space-y-4">
            {activity.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                <div>
                  <p className="text-slate-800">{a.message}</p>
                  <p className="text-slate-500">
                    {a.actor_name || 'System'} · {formatDate(a.created_at)}
                  </p>
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
        team={team}
        labels={labels}
        onCreated={() => {
          setTaskOpen(false)
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
  team,
  labels,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  team: TeamMember[]
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
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Title
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Description
          <textarea className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Type
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as TaskType)}>
            <option value="task">Task</option>
            <option value="bug">Bug</option>
            <option value="story">Story</option>
            <option value="epic">Epic</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Status
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {TASK_COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Priority
          <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            <option value="lowest">Lowest</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="highest">Highest</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Assignee
          <select className={inputClass} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Unassigned</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Due date
          <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Story points
          <input type="number" min={0} max={100} className={inputClass} value={points} onChange={(e) => setPoints(e.target.value)} />
        </label>
        {labels.length > 0 && (
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-slate-700">Labels</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {labels.map((l) => (
                <label key={l.id} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={labelIds.includes(l.id)}
                    onChange={(e) =>
                      setLabelIds((prev) =>
                        e.target.checked ? [...prev, l.id] : prev.filter((x) => x !== l.id),
                      )
                    }
                  />
                  <span className="rounded px-2 py-0.5 text-xs text-white" style={{ background: l.color }}>
                    {l.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
