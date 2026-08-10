from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_membership
from app.database import get_db
from app.models import Activity, Project, ProjectMember, ProjectStatus, Task, TaskStatus, User
from app.schemas import DashboardOut, ProjectOut, ProjectStats, TaskOut
from app.api.projects import _project_stats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def get_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardOut:
    member_project_ids = [
        m.project_id
        for m in db.query(ProjectMember).filter(ProjectMember.user_id == user.id).all()
    ]

    projects = []
    if member_project_ids:
        projects = (
            db.query(Project)
            .options(joinedload(Project.owner))
            .filter(Project.id.in_(member_project_ids))
            .order_by(Project.updated_at.desc())
            .all()
        )

    active_projects = sum(1 for p in projects if p.status == ProjectStatus.active)

    my_tasks_q = (
        db.query(Task)
        .options(
            joinedload(Task.assignee),
            joinedload(Task.reporter),
            joinedload(Task.labels),
            joinedload(Task.comments),
            joinedload(Task.project),
        )
        .filter(Task.assignee_id == user.id, Task.status != TaskStatus.done)
        .order_by(Task.due_date.asc().nullslast(), Task.updated_at.desc())
        .limit(20)
    )
    my_tasks = my_tasks_q.all() if member_project_ids else []

    today = date.today()
    overdue = sum(
        1 for t in my_tasks if t.due_date and t.due_date < today and t.status != TaskStatus.done
    )

    recent_activity: list[Activity] = []
    if member_project_ids:
        recent_activity = (
            db.query(Activity)
            .options(joinedload(Activity.actor))
            .filter(Activity.project_id.in_(member_project_ids))
            .order_by(Activity.created_at.desc())
            .limit(15)
            .all()
        )

    recent_projects: list[ProjectOut] = []
    for p in projects[:6]:
        out = ProjectOut.model_validate(p)
        out.stats = _project_stats(db, p.id)
        membership = get_membership(db, p.id, user.id)
        out.my_role = membership.role if membership else None
        recent_projects.append(out)

    task_outs: list[TaskOut] = []
    for t in my_tasks:
        out = TaskOut.model_validate(t)
        out.comment_count = len(t.comments) if t.comments is not None else 0
        out.issue_key = f"{t.project.key}-{t.number}" if t.project else str(t.number)
        task_outs.append(out)

    return DashboardOut(
        project_count=len(projects),
        active_projects=active_projects,
        my_open_tasks=len(my_tasks),
        overdue_tasks=overdue,
        recent_projects=recent_projects,
        my_tasks=task_outs,
        recent_activity=recent_activity,
    )
