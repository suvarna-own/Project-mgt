import type {
  Activity,
  Comment,
  Dashboard,
  Label,
  Project,
  ProjectPriority,
  ProjectStatus,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  TeamMember,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || JSON.stringify(data)
      if (Array.isArray(detail)) {
        detail = detail.map((d: { msg?: string }) => d.msg || String(d)).join(', ')
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  dashboard: () => request<Dashboard>('/dashboard'),

  teamMembers: () => request<TeamMember[]>('/team-members'),

  projects: (status?: string) =>
    request<Project[]>(`/projects${status ? `?status=${status}` : ''}`),

  createProject: (body: {
    name: string
    key: string
    description?: string
    status?: ProjectStatus
    priority?: ProjectPriority
    start_date?: string | null
    target_date?: string | null
    budget?: number | null
  }) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(body) }),

  project: (id: number) => request<Project>(`/projects/${id}`),

  updateProject: (id: number, body: Partial<Project>) =>
    request<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteProject: (id: number) =>
    request<{ detail: string }>(`/projects/${id}`, { method: 'DELETE' }),

  labels: (projectId: number) => request<Label[]>(`/projects/${projectId}/labels`),

  activity: (projectId: number) => request<Activity[]>(`/projects/${projectId}/activity`),

  tasks: (projectId: number, params?: { status?: string; q?: string }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.q) qs.set('q', params.q)
    const suffix = qs.toString() ? `?${qs}` : ''
    return request<Task[]>(`/projects/${projectId}/tasks${suffix}`)
  },

  createTask: (
    projectId: number,
    body: {
      title: string
      description?: string
      status?: TaskStatus
      priority?: TaskPriority
      type?: TaskType
      story_points?: number | null
      due_date?: string | null
      assignee_id?: number | null
      label_ids?: number[]
    },
  ) =>
    request<Task>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  task: (id: number) => request<Task>(`/tasks/${id}`),

  updateTask: (id: number, body: Record<string, unknown>) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  moveTask: (id: number, body: { status: TaskStatus; position: number }) =>
    request<Task>(`/tasks/${id}/move`, { method: 'POST', body: JSON.stringify(body) }),

  deleteTask: (id: number) => request<{ detail: string }>(`/tasks/${id}`, { method: 'DELETE' }),

  comments: (taskId: number) => request<Comment[]>(`/tasks/${taskId}/comments`),

  addComment: (taskId: number, body: string, authorName = 'Anonymous') =>
    request<Comment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, author_name: authorName }),
    }),
}

export { ApiError }
