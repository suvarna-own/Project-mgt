import type { ReactNode } from 'react'
import type { User } from '../types'

export function Avatar({ user, size = 32 }: { user: Pick<User, 'full_name' | 'avatar_color'>; size?: number }) {
  const initials = user.full_name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: user.avatar_color,
      }}
      title={user.full_name}
    >
      {initials}
    </span>
  )
}

export function StatusBadge({
  value,
  kind = 'neutral',
}: {
  value: string
  kind?: 'neutral' | 'success' | 'warn' | 'danger' | 'info'
}) {
  return <span className={`badge badge-${kind}`}>{value.replaceAll('_', ' ')}</span>
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

export function formatBudget(cents: number | null | undefined) {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const TASK_COLUMNS: { id: import('../types').TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
]

export function priorityKind(p: string): 'neutral' | 'success' | 'warn' | 'danger' | 'info' {
  if (p === 'critical' || p === 'highest' || p === 'high') return 'danger'
  if (p === 'medium') return 'warn'
  if (p === 'low' || p === 'lowest') return 'info'
  return 'neutral'
}

export function statusKind(s: string): 'neutral' | 'success' | 'warn' | 'danger' | 'info' {
  if (s === 'active' || s === 'done' || s === 'completed') return 'success'
  if (s === 'blocked' || s === 'on_hold') return 'danger'
  if (s === 'in_progress' || s === 'in_review') return 'info'
  if (s === 'planning' || s === 'todo') return 'warn'
  return 'neutral'
}
