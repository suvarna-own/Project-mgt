from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_membership, require_project_access
from app.database import get_db
from app.models import (
    Activity,
    Label,
    MemberRole,
    Project,
    ProjectMember,
    Task,
    TaskStatus,
    User,
)
from app.schemas import (
    ActivityOut,
    LabelCreate,
    LabelOut,
    MemberCreate,
    MemberOut,
    MemberUpdate,
    MessageOut,
    ProjectCreate,
    ProjectOut,
    ProjectStats,
    ProjectUpdate,
)

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
    members = (
        db.query(func.count(ProjectMember.id)).filter(ProjectMember.project_id == project_id).scalar()
        or 0
    )
    pct = round((done / total) * 100, 1) if total else 0.0
    return ProjectStats(
        total_tasks=total,
        done_tasks=done,
        in_progress_tasks=in_progress,
        blocked_tasks=blocked,
        completion_percent=pct,
        member_count=members,
    )


def _serialize_project(db: Session, project: Project, user_id: int) -> ProjectOut:
    membership = get_membership(db, project.id, user_id)
    out = ProjectOut.model_validate(project)
    out.stats = _project_stats(db, project.id)
    out.my_role = membership.role if membership else None
    return out


def _log(
    db: Session,
    project_id: int,
    actor_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None,
    message: str,
) -> None:
    db.add(
        Activity(
            project_id=project_id,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            message=message,
        )
    )


@router.get("", response_model=list[ProjectOut])
def list_projects(
    status_filter: str | None = Query(default=None, alias="status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProjectOut]:
    q = (
        db.query(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .options(joinedload(Project.owner))
        .filter(ProjectMember.user_id == user.id)
    )
    if status_filter:
        q = q.filter(Project.status == status_filter)
    projects = q.order_by(Project.updated_at.desc()).all()
    return [_serialize_project(db, p, user.id) for p in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectOut:
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
        is_public=payload.is_public,
        owner_id=user.id,
    )
    db.add(project)
    db.flush()
    db.add(ProjectMember(project_id=project.id, user_id=user.id, role=MemberRole.owner))
    for name, color in [
        ("Frontend", "#0D9488"),
        ("Backend", "#0369A1"),
        ("Design", "#B45309"),
        ("Urgent", "#BE123C"),
    ]:
        db.add(Label(project_id=project.id, name=name, color=color))
    _log(db, project.id, user.id, "created", "project", project.id, f"Created project {project.key}")
    db.commit()
    db.refresh(project)
    project = (
        db.query(Project).options(joinedload(Project.owner)).filter(Project.id == project.id).one()
    )
    return _serialize_project(db, project, user.id)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectOut:
    project, _ = require_project_access(project_id, user, db)
    return _serialize_project(db, project, user.id)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectOut:
    project, _ = require_project_access(project_id, user, db, min_role=MemberRole.admin)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(project, key, value)
    _log(db, project.id, user.id, "updated", "project", project.id, f"Updated project {project.key}")
    db.add(project)
    db.commit()
    db.refresh(project)
    return _serialize_project(db, project, user.id)


@router.delete("/{project_id}", response_model=MessageOut)
def delete_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    project, _ = require_project_access(project_id, user, db, min_role=MemberRole.owner)
    db.delete(project)
    db.commit()
    return MessageOut(detail="Project deleted")


@router.get("/{project_id}/members", response_model=list[MemberOut])
def list_members(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProjectMember]:
    require_project_access(project_id, user, db)
    return (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.created_at)
        .all()
    )


@router.post("/{project_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def add_member(
    project_id: int,
    payload: MemberCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectMember:
    require_project_access(project_id, user, db, min_role=MemberRole.admin)
    target = db.query(User).filter(User.email == payload.email.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found. They must register first.")
    if get_membership(db, project_id, target.id):
        raise HTTPException(status_code=400, detail="User is already a member")
    if payload.role == MemberRole.owner:
        raise HTTPException(status_code=400, detail="Cannot assign owner via invite")
    member = ProjectMember(project_id=project_id, user_id=target.id, role=payload.role)
    db.add(member)
    _log(
        db,
        project_id,
        user.id,
        "member_added",
        "member",
        target.id,
        f"Added {target.full_name} as {payload.role.value}",
    )
    db.commit()
    db.refresh(member)
    return (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(ProjectMember.id == member.id)
        .one()
    )


@router.patch("/{project_id}/members/{member_id}", response_model=MemberOut)
def update_member(
    project_id: int,
    member_id: int,
    payload: MemberUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectMember:
    require_project_access(project_id, user, db, min_role=MemberRole.admin)
    member = (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == MemberRole.owner:
        raise HTTPException(status_code=400, detail="Cannot change owner role")
    if payload.role == MemberRole.owner:
        raise HTTPException(status_code=400, detail="Cannot promote to owner this way")
    member.role = payload.role
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{project_id}/members/{member_id}", response_model=MessageOut)
def remove_member(
    project_id: int,
    member_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    require_project_access(project_id, user, db, min_role=MemberRole.admin)
    member = (
        db.query(ProjectMember)
        .filter(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == MemberRole.owner:
        raise HTTPException(status_code=400, detail="Cannot remove project owner")
    db.delete(member)
    db.commit()
    return MessageOut(detail="Member removed")


@router.get("/{project_id}/labels", response_model=list[LabelOut])
def list_labels(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Label]:
    require_project_access(project_id, user, db)
    return db.query(Label).filter(Label.project_id == project_id).order_by(Label.name).all()


@router.post("/{project_id}/labels", response_model=LabelOut, status_code=status.HTTP_201_CREATED)
def create_label(
    project_id: int,
    payload: LabelCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Label:
    require_project_access(project_id, user, db, min_role=MemberRole.member)
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
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Activity]:
    require_project_access(project_id, user, db)
    return (
        db.query(Activity)
        .options(joinedload(Activity.actor))
        .filter(Activity.project_id == project_id)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )
