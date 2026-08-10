import type {
  Activity,
  Comment,
  Dashboard,
  Label,
  Member,
  MemberRole,
  Project,
  ProjectPriority,
  ProjectStatus,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  TokenResponse,
  User,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getToken(): string | null {
  return localStorage.getItem('atlas_token')
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('atlas_token', token)
  else localStorage.removeItem('atlas_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

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
  register: (body: {
    email: string
    full_name: string
    password: string
    job_title?: string
  }) => request<TokenResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request<User>('/auth/me'),

  users: (q?: string) => request<User[]>(`/auth/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  dashboard: () => request<Dashboard>('/dashboard'),

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

  members: (projectId: number) => request<Member[]>(`/projects/${projectId}/members`),

  addMember: (projectId: number, body: { email: string; role: MemberRole }) =>
    request<Member>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  removeMember: (projectId: number, memberId: number) =>
    request<{ detail: string }>(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    }),

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

  addComment: (taskId: number, body: string) =>
    request<Comment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
}

export { ApiError }
