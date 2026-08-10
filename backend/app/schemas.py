from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import (
    MemberRole,
    ProjectPriority,
    ProjectStatus,
    TaskPriority,
    TaskStatus,
    TaskType,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ——— Users / Auth ———


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    job_title: str | None = Field(default=None, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    job_title: str | None = Field(default=None, max_length=120)
    avatar_color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")


class UserOut(ORMModel):
    id: int
    email: EmailStr
    full_name: str
    avatar_color: str
    job_title: str | None
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ——— Labels ———


class LabelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    color: str = Field(default="#64748B", pattern=r"^#[0-9A-Fa-f]{6}$")


class LabelOut(ORMModel):
    id: int
    name: str
    color: str
    project_id: int


# ——— Members ———


class MemberCreate(BaseModel):
    email: EmailStr
    role: MemberRole = MemberRole.member


class MemberUpdate(BaseModel):
    role: MemberRole


class MemberOut(ORMModel):
    id: int
    role: MemberRole
    user: UserOut
    created_at: datetime


# ——— Projects ———


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    key: str = Field(min_length=2, max_length=10, pattern=r"^[A-Z][A-Z0-9]+$")
    description: str | None = None
    status: ProjectStatus = ProjectStatus.planning
    priority: ProjectPriority = ProjectPriority.medium
    start_date: date | None = None
    target_date: date | None = None
    budget: int | None = Field(default=None, ge=0)
    is_public: bool = False


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = None
    status: ProjectStatus | None = None
    priority: ProjectPriority | None = None
    start_date: date | None = None
    target_date: date | None = None
    budget: int | None = Field(default=None, ge=0)
    is_public: bool | None = None


class ProjectStats(BaseModel):
    total_tasks: int
    done_tasks: int
    in_progress_tasks: int
    blocked_tasks: int
    completion_percent: float
    member_count: int


class ProjectOut(ORMModel):
    id: int
    name: str
    key: str
    description: str | None
    status: ProjectStatus
    priority: ProjectPriority
    start_date: date | None
    target_date: date | None
    budget: int | None
    is_public: bool
    owner_id: int
    owner: UserOut
    created_at: datetime
    updated_at: datetime
    stats: ProjectStats | None = None
    my_role: MemberRole | None = None


# ——— Tasks ———


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    type: TaskType = TaskType.task
    story_points: int | None = Field(default=None, ge=0, le=100)
    due_date: date | None = None
    assignee_id: int | None = None
    label_ids: list[int] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    type: TaskType | None = None
    story_points: int | None = Field(default=None, ge=0, le=100)
    due_date: date | None = None
    assignee_id: int | None = None
    label_ids: list[int] | None = None
    position: int | None = None


class TaskMove(BaseModel):
    status: TaskStatus
    position: int = 0


class TaskOut(ORMModel):
    id: int
    project_id: int
    number: int
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    type: TaskType
    story_points: int | None
    due_date: date | None
    position: int
    assignee_id: int | None
    reporter_id: int
    assignee: UserOut | None = None
    reporter: UserOut
    labels: list[LabelOut] = Field(default_factory=list)
    comment_count: int = 0
    created_at: datetime
    updated_at: datetime
    issue_key: str | None = None


# ——— Comments ———


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class CommentOut(ORMModel):
    id: int
    task_id: int
    body: str
    author: UserOut
    created_at: datetime
    updated_at: datetime


# ——— Activity / Dashboard ———


class ActivityOut(ORMModel):
    id: int
    project_id: int
    action: str
    entity_type: str
    entity_id: int | None
    message: str
    actor: UserOut | None
    created_at: datetime


class DashboardOut(BaseModel):
    project_count: int
    active_projects: int
    my_open_tasks: int
    overdue_tasks: int
    recent_projects: list[ProjectOut]
    my_tasks: list[TaskOut]
    recent_activity: list[ActivityOut]


class MessageOut(BaseModel):
    detail: str
