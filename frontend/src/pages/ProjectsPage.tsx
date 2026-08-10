import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import {
  EmptyState,
  Modal,
  StatusBadge,
  formatBudget,
  formatDate,
  priorityKind,
  statusKind,
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
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h1>Projects</h1>
          <p className="lede">Production project records with status, priority, budget, and delivery dates.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          New project
        </button>
      </header>

      <div className="toolbar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="page-loading">Loading projects…</div>
      ) : projects.length === 0 ? (
        <EmptyState title="No projects" body="Create a project to organize tasks, members, and delivery." />
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
              <div className="project-card-top">
                <span className="project-key">{p.key}</span>
                <StatusBadge value={p.priority} kind={priorityKind(p.priority)} />
              </div>
              <h3>{p.name}</h3>
              <p>{p.description || 'No description'}</p>
              <div className="progress">
                <div style={{ width: `${p.stats?.completion_percent ?? 0}%` }} />
              </div>
              <div className="project-card-meta">
                <StatusBadge value={p.status} kind={statusKind(p.status)} />
                <span>{p.stats?.done_tasks ?? 0}/{p.stats?.total_tasks ?? 0} done</span>
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
      <form className="form-grid" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </label>
        <label>
          Key
          <input
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            required
            minLength={2}
            maxLength={10}
            pattern="[A-Z][A-Z0-9]+"
            placeholder="e.g. CPR"
          />
        </label>
        <label className="full">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as ProjectPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          Target date
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </label>
        <label>
          Budget (USD)
          <input
            type="number"
            min={0}
            step={1000}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="250000"
          />
        </label>
        <div className="form-actions full">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
