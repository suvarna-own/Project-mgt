from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_project_or_404
from app.database import get_db
from app.models import Activity, Comment, Label, Task
from app.schemas import (
    CommentCreate,
    CommentOut,
    MessageOut,
    TaskCreate,
    TaskMove,
    TaskOut,
    TaskUpdate,
)

router = APIRouter(tags=["tasks"])


def _serialize_task(task: Task, project_key: str | None = None) -> TaskOut:
    key = project_key or (task.project.key if task.project else "")
    out = TaskOut.model_validate(task)
    out.comment_count = len(task.comments) if task.comments is not None else 0
    out.issue_key = f"{key}-{task.number}" if key else str(task.number)
    return out


def _load_task(db: Session, task_id: int) -> Task | None:
    return (
        db.query(Task)
        .options(
            joinedload(Task.assignee),
            joinedload(Task.labels),
            joinedload(Task.comments),
            joinedload(Task.project),
        )
        .filter(Task.id == task_id)
        .first()
    )


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


@router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    project_id: int,
    status_filter: str | None = Query(default=None, alias="status"),
    assignee_id: int | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
) -> list[TaskOut]:
    project = get_project_or_404(db, project_id)
    query = (
        db.query(Task)
        .options(
            joinedload(Task.assignee),
            joinedload(Task.labels),
            joinedload(Task.comments),
        )
        .filter(Task.project_id == project_id)
    )
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)
    if q:
        like = f"%{q}%"
        query = query.filter(Task.title.ilike(like))
    tasks = query.order_by(Task.position.asc(), Task.updated_at.desc()).all()
    return [_serialize_task(t, project.key) for t in tasks]


@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskOut,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    project_id: int, payload: TaskCreate, db: Session = Depends(get_db)
) -> TaskOut:
    project = get_project_or_404(db, project_id)
    next_number = (
        db.query(func.coalesce(func.max(Task.number), 0)).filter(Task.project_id == project_id).scalar()
        + 1
    )
    max_pos = (
        db.query(func.coalesce(func.max(Task.position), 0))
        .filter(Task.project_id == project_id, Task.status == payload.status)
        .scalar()
    )
    task = Task(
        project_id=project_id,
        number=next_number,
        title=payload.title.strip(),
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        type=payload.type,
        story_points=payload.story_points,
        due_date=payload.due_date,
        position=max_pos + 1,
        assignee_id=payload.assignee_id,
    )
    if payload.label_ids:
        labels = (
            db.query(Label)
            .filter(Label.project_id == project_id, Label.id.in_(payload.label_ids))
            .all()
        )
        task.labels = labels
    db.add(task)
    db.flush()
    _log(
        db,
        project_id,
        None,
        "created",
        "task",
        task.id,
        f"Created {project.key}-{task.number}: {task.title}",
    )
    db.commit()
    loaded = _load_task(db, task.id)
    assert loaded
    return _serialize_task(loaded, project.key)


@router.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)) -> TaskOut:
    task = _load_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _serialize_task(task)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)) -> TaskOut:
    task = _load_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    data = payload.model_dump(exclude_unset=True)
    label_ids = data.pop("label_ids", None)
    for key, value in data.items():
        setattr(task, key, value)
    if label_ids is not None:
        labels = (
            db.query(Label)
            .filter(Label.project_id == task.project_id, Label.id.in_(label_ids))
            .all()
        )
        task.labels = labels
    _log(
        db,
        task.project_id,
        None,
        "updated",
        "task",
        task.id,
        f"Updated {task.project.key}-{task.number}",
    )
    db.add(task)
    db.commit()
    loaded = _load_task(db, task.id)
    assert loaded
    return _serialize_task(loaded)


@router.post("/tasks/{task_id}/move", response_model=TaskOut)
def move_task(task_id: int, payload: TaskMove, db: Session = Depends(get_db)) -> TaskOut:
    task = _load_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    old_status = task.status
    task.status = payload.status
    task.position = payload.position
    _log(
        db,
        task.project_id,
        None,
        "moved",
        "task",
        task.id,
        f"Moved {task.project.key}-{task.number} from {old_status.value} to {payload.status.value}",
    )
    db.add(task)
    db.commit()
    loaded = _load_task(db, task.id)
    assert loaded
    return _serialize_task(loaded)


@router.delete("/tasks/{task_id}", response_model=MessageOut)
def delete_task(task_id: int, db: Session = Depends(get_db)) -> MessageOut:
    task = _load_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    project_id = task.project_id
    key = f"{task.project.key}-{task.number}"
    db.delete(task)
    _log(db, project_id, None, "deleted", "task", task_id, f"Deleted {key}")
    db.commit()
    return MessageOut(detail="Task deleted")


@router.get("/tasks/{task_id}/comments", response_model=list[CommentOut])
def list_comments(task_id: int, db: Session = Depends(get_db)) -> list[Comment]:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return (
        db.query(Comment)
        .filter(Comment.task_id == task_id)
        .order_by(Comment.created_at.asc())
        .all()
    )


@router.post(
    "/tasks/{task_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_comment(
    task_id: int, payload: CommentCreate, db: Session = Depends(get_db)
) -> Comment:
    task = _load_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    comment = Comment(
        task_id=task_id,
        author_name=payload.author_name.strip(),
        body=payload.body.strip(),
    )
    db.add(comment)
    _log(
        db,
        task.project_id,
        payload.author_name,
        "commented",
        "task",
        task.id,
        f"Commented on {task.project.key}-{task.number}",
    )
    db.commit()
    db.refresh(comment)
    return comment
