from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProjectStatus(str, enum.Enum):
    planning = "planning"
    active = "active"
    on_hold = "on_hold"
    completed = "completed"
    archived = "archived"


class ProjectPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class TaskStatus(str, enum.Enum):
    backlog = "backlog"
    todo = "todo"
    in_progress = "in_progress"
    in_review = "in_review"
    done = "done"
    blocked = "blocked"


class TaskPriority(str, enum.Enum):
    lowest = "lowest"
    low = "low"
    medium = "medium"
    high = "high"
    highest = "highest"


class TaskType(str, enum.Enum):
    task = "task"
    bug = "bug"
    story = "story"
    epic = "epic"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TeamMember(Base, TimestampMixin):
    """Assignable team member — no authentication."""

    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_color: Mapped[str] = mapped_column(String(7), default="#0D9488")
    job_title: Mapped[str | None] = mapped_column(String(120), nullable=True)

    assigned_tasks: Mapped[list[Task]] = relationship(
        back_populates="assignee", foreign_keys="Task.assignee_id"
    )


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    key: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.planning, index=True
    )
    priority: Mapped[ProjectPriority] = mapped_column(
        Enum(ProjectPriority), default=ProjectPriority.medium
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    budget: Mapped[int | None] = mapped_column(Integer, nullable=True)

    tasks: Mapped[list[Task]] = relationship(back_populates="project", cascade="all, delete-orphan")
    labels: Mapped[list[Label]] = relationship(back_populates="project", cascade="all, delete-orphan")
    activities: Mapped[list[Activity]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class Label(Base, TimestampMixin):
    __tablename__ = "labels"
    __table_args__ = (UniqueConstraint("project_id", "name", name="uq_project_label"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#64748B")

    project: Mapped[Project] = relationship(back_populates="labels")
    tasks: Mapped[list[Task]] = relationship(secondary="task_labels", back_populates="labels")


class TaskLabel(Base):
    __tablename__ = "task_labels"

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    label_id: Mapped[int] = mapped_column(ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.todo, index=True)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority), default=TaskPriority.medium)
    type: Mapped[TaskType] = mapped_column(Enum(TaskType), default=TaskType.task)
    story_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("team_members.id"), nullable=True)

    project: Mapped[Project] = relationship(back_populates="tasks")
    assignee: Mapped[TeamMember | None] = relationship(
        back_populates="assigned_tasks", foreign_keys=[assignee_id]
    )
    labels: Mapped[list[Label]] = relationship(secondary="task_labels", back_populates="tasks")
    comments: Mapped[list[Comment]] = relationship(
        back_populates="task", cascade="all, delete-orphan", order_by="Comment.created_at"
    )


class Comment(Base, TimestampMixin):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    author_name: Mapped[str] = mapped_column(String(120), default="Anonymous")
    body: Mapped[str] = mapped_column(Text, nullable=False)

    task: Mapped[Task] = relationship(back_populates="comments")


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    actor_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped[Project] = relationship(back_populates="activities")
