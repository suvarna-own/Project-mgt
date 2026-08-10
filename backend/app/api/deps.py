from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.core.security import decode_access_token
from app.database import get_db
from app.models import MemberRole, Project, ProjectMember, User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or missing")
    return user


def get_membership(db: Session, project_id: int, user_id: int) -> ProjectMember | None:
    return (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .first()
    )


def require_project_access(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    min_role: MemberRole = MemberRole.viewer,
) -> tuple[Project, ProjectMember]:
    project = (
        db.query(Project)
        .options(joinedload(Project.owner))
        .filter(Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    membership = get_membership(db, project_id, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this project")

    role_rank = {
        MemberRole.viewer: 1,
        MemberRole.member: 2,
        MemberRole.admin: 3,
        MemberRole.owner: 4,
    }
    if role_rank[membership.role] < role_rank[min_role]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return project, membership
