import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import {
  Alert,
  Badge,
  EmptyState,
  Modal,
  PageLoader,
  btnPrimary,
  btnSecondary,
  formatBudget,
  formatDate,
  inputClass,
} from '../components/ui'
import type { Project, ProjectPriority, ProjectStatus } from '../types'

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  async function load(status?: string) {
    setLoading(true)
    try {
      const data = await api.projects(status || undefined)
      setProjects(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(statusFilter)
  }, [statusFilter])

  return (
    <div className="p-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-teal-600">Portfolio</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Projects</h1>
          <p className="mt-2 text-slate-600">Manage projects, tasks, and delivery timelines.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>
          New project
        </button>
      </header>

      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <PageLoader label="Loading projects…" />
      ) : projects.length === 0 ? (
        <EmptyState title="No projects" body="Create a project to organize your work." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-lg bg-teal-100 px-2.5 py-1 text-sm font-bold text-teal-800">
                  {p.key}
                </span>
                <Badge value={p.priority} />
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-teal-700">{p.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                {p.description || 'No description'}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{ width: `${p.stats?.completion_percent ?? 0}%` }}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge value={p.status} />
                <span>
                  {p.stats?.done_tasks ?? 0}/{p.stats?.total_tasks ?? 0} done
                </span>
                <span>Due {formatDate(p.target_date)}</span>
                <span>{formatBudget(p.budget)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false)
          void load(statusFilter)
        }}
      />
    </div>
  )
}

function CreateProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('planning')
  const [priority, setPriority] = useState<ProjectPriority>('medium')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [budget, setBudget] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.createProject({
        name,
        key: key.toUpperCase(),
        description: description || undefined,
        status,
        priority,
        start_date: startDate || null,
        target_date: targetDate || null,
        budget: budget ? Math.round(Number(budget) * 100) : null,
      })
      setName('')
      setKey('')
      setDescription('')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="New project" onClose={onClose} wide>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <label className="text-sm font-medium text-slate-700">
          Name
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Key
          <input
            className={inputClass}
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            required
            minLength={2}
            maxLength={10}
            pattern="[A-Z][A-Z0-9]+"
            placeholder="e.g. CPR"
          />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Description
          <textarea className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Status
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Priority
          <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as ProjectPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Start date
          <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Target date
          <input type="date" className={inputClass} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Budget (USD)
          <input type="number" min={0} step={1000} className={inputClass} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="250000" />
        </label>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
