from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_project_or_404
from app.database import get_db
from app.models import Activity, Label, Project, Task, TaskStatus
from app.schemas import (
    ActivityOut,
    LabelCreate,
    LabelOut,
    MessageOut,
    ProjectCreate,
    ProjectOut,
    ProjectStats,
    ProjectUpdate,
    TeamMemberOut,
)
from app.models import TeamMember

router = APIRouter(prefix="/projects", tags=["projects"])


def _project_stats(db: Session, project_id: int) -> ProjectStats:
    total = db.query(func.count(Task.id)).filter(Task.project_id == project_id).scalar() or 0
    done = (
        db.query(func.count(Task.id))
        .filter(Task.project_id == project_id, Task.status == TaskStatus.done)
        .scalar()
        or 0
    )
    in_progress = (
        db.query(func.count(Task.id))
        .filter(Task.project_id == project_id, Task.status == TaskStatus.in_progress)
        .scalar()
        or 0
    )
    blocked = (
        db.query(func.count(Task.id))
        .filter(Task.project_id == project_id, Task.status == TaskStatus.blocked)
        .scalar()
        or 0
    )
    pct = round((done / total) * 100, 1) if total else 0.0
    return ProjectStats(
        total_tasks=total,
        done_tasks=done,
        in_progress_tasks=in_progress,
        blocked_tasks=blocked,
        completion_percent=pct,
    )


def _serialize_project(db: Session, project: Project) -> ProjectOut:
    out = ProjectOut.model_validate(project)
    out.stats = _project_stats(db, project.id)
    return out


def _log(
    db: Session,
    project_id: int,
    actor_name: str | None,
    action: str,
    entity_type: str,
    entity_id: int | None,
    message: str,
) -> None:
    db.add(
        Activity(
            project_id=project_id,
            actor_name=actor_name,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            message=message,
        )
    )


@router.get("", response_model=list[ProjectOut])
def list_projects(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[ProjectOut]:
    q = db.query(Project)
    if status_filter:
        q = q.filter(Project.status == status_filter)
    projects = q.order_by(Project.updated_at.desc()).all()
    return [_serialize_project(db, p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> ProjectOut:
    key = payload.key.upper()
    if db.query(Project).filter(Project.key == key).first():
        raise HTTPException(status_code=400, detail="Project key already exists")
    project = Project(
        name=payload.name.strip(),
        key=key,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        start_date=payload.start_date,
        target_date=payload.target_date,
        budget=payload.budget,
    )
    db.add(project)
    db.flush()
    for name, color in [
        ("Frontend", "#0D9488"),
        ("Backend", "#0369A1"),
        ("Design", "#B45309"),
        ("Urgent", "#BE123C"),
    ]:
        db.add(Label(project_id=project.id, name=name, color=color))
    _log(db, project.id, None, "created", "project", project.id, f"Created project {project.key}")
    db.commit()
    db.refresh(project)
    return _serialize_project(db, project)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)) -> ProjectOut:
    project = get_project_or_404(db, project_id)
    return _serialize_project(db, project)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)
) -> ProjectOut:
    project = get_project_or_404(db, project_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(project, key, value)
    _log(db, project.id, None, "updated", "project", project.id, f"Updated project {project.key}")
    db.add(project)
    db.commit()
    db.refresh(project)
    return _serialize_project(db, project)


@router.delete("/{project_id}", response_model=MessageOut)
def delete_project(project_id: int, db: Session = Depends(get_db)) -> MessageOut:
    project = get_project_or_404(db, project_id)
    db.delete(project)
    db.commit()
    return MessageOut(detail="Project deleted")


@router.get("/{project_id}/labels", response_model=list[LabelOut])
def list_labels(project_id: int, db: Session = Depends(get_db)) -> list[Label]:
    get_project_or_404(db, project_id)
    return db.query(Label).filter(Label.project_id == project_id).order_by(Label.name).all()


@router.post("/{project_id}/labels", response_model=LabelOut, status_code=status.HTTP_201_CREATED)
def create_label(
    project_id: int, payload: LabelCreate, db: Session = Depends(get_db)
) -> Label:
    get_project_or_404(db, project_id)
    exists = (
        db.query(Label)
        .filter(Label.project_id == project_id, Label.name == payload.name)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Label already exists")
    label = Label(project_id=project_id, name=payload.name, color=payload.color)
    db.add(label)
    db.commit()
    db.refresh(label)
    return label


@router.get("/{project_id}/activity", response_model=list[ActivityOut])
def list_activity(
    project_id: int,
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Activity]:
    get_project_or_404(db, project_id)
    return (
        db.query(Activity)
        .filter(Activity.project_id == project_id)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )


members_router = APIRouter(prefix="/team-members", tags=["team"])


@members_router.get("", response_model=list[TeamMemberOut])
def list_team_members(db: Session = Depends(get_db)) -> list[TeamMember]:
    return db.query(TeamMember).order_by(TeamMember.full_name).all()
