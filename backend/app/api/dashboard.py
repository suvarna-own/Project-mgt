from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.api.projects import _project_stats, _serialize_project
from app.database import get_db
from app.models import Activity, Project, ProjectStatus, Task, TaskStatus
from app.schemas import DashboardOut, ProjectOut, TaskOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def get_dashboard(db: Session = Depends(get_db)) -> DashboardOut:
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    active_projects = sum(1 for p in projects if p.status == ProjectStatus.active)

    open_tasks_q = (
        db.query(Task)
        .options(
            joinedload(Task.assignee),
            joinedload(Task.labels),
            joinedload(Task.comments),
            joinedload(Task.project),
        )
        .filter(Task.status != TaskStatus.done)
        .order_by(Task.due_date.asc().nullslast(), Task.updated_at.desc())
        .limit(20)
    )
    open_tasks = open_tasks_q.all()

    today = date.today()
    overdue = sum(
        1 for t in open_tasks if t.due_date and t.due_date < today and t.status != TaskStatus.done
    )

    recent_activity = (
        db.query(Activity).order_by(Activity.created_at.desc()).limit(15).all()
    )

    recent_projects: list[ProjectOut] = [_serialize_project(db, p) for p in projects[:6]]

    task_outs: list[TaskOut] = []
    for t in open_tasks[:10]:
        out = TaskOut.model_validate(t)
        out.comment_count = len(t.comments) if t.comments is not None else 0
        out.issue_key = f"{t.project.key}-{t.number}" if t.project else str(t.number)
        task_outs.append(out)

    return DashboardOut(
        project_count=len(projects),
        active_projects=active_projects,
        open_tasks=len(open_tasks),
        overdue_tasks=overdue,
        recent_projects=recent_projects,
        recent_tasks=task_outs,
        recent_activity=recent_activity,
    )
