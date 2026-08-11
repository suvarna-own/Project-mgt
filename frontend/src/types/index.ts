export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
export type TaskPriority = 'lowest' | 'low' | 'medium' | 'high' | 'highest'
export type TaskType = 'task' | 'bug' | 'story' | 'epic'

export interface TeamMember {
  id: number
  full_name: string
  email: string | null
  avatar_color: string
  job_title: string | null
  created_at: string
}

export interface ProjectStats {
  total_tasks: number
  done_tasks: number
  in_progress_tasks: number
  blocked_tasks: number
  completion_percent: number
}

export interface Project {
  id: number
  name: string
  key: string
  description: string | null
  status: ProjectStatus
  priority: ProjectPriority
  start_date: string | null
  target_date: string | null
  budget: number | null
  created_at: string
  updated_at: string
  stats?: ProjectStats | null
}

export interface Label {
  id: number
  name: string
  color: string
  project_id: number
}

export interface Task {
  id: number
  project_id: number
  number: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  type: TaskType
  story_points: number | null
  due_date: string | null
  position: number
  assignee_id: number | null
  assignee?: TeamMember | null
  labels: Label[]
  comment_count: number
  created_at: string
  updated_at: string
  issue_key?: string | null
}

export interface Comment {
  id: number
  task_id: number
  body: string
  author_name: string
  created_at: string
  updated_at: string
}

export interface Activity {
  id: number
  project_id: number
  action: string
  entity_type: string
  entity_id: number | null
  message: string
  actor_name: string | null
  created_at: string
}

export interface Dashboard {
  project_count: number
  active_projects: number
  open_tasks: number
  overdue_tasks: number
  recent_projects: Project[]
  recent_tasks: Task[]
  recent_activity: Activity[]
}
