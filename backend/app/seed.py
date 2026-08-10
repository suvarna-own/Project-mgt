"""Seed demo data for local development."""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    Activity,
    Comment,
    Label,
    MemberRole,
    Project,
    ProjectMember,
    ProjectPriority,
    ProjectStatus,
    Task,
    TaskPriority,
    TaskStatus,
    TaskType,
    User,
)


def seed_if_empty(db: Session) -> None:
    if db.query(User).first():
        return

    colors = ["#0D9488", "#0369A1", "#B45309", "#BE123C", "#7C3AED"]
    users_data = [
        ("alex@atlas.dev", "Alex Rivera", "Engineering Manager", colors[0]),
        ("sam@atlas.dev", "Sam Chen", "Full-stack Engineer", colors[1]),
        ("jordan@atlas.dev", "Jordan Lee", "Product Designer", colors[2]),
        ("morgan@atlas.dev", "Morgan Blake", "QA Lead", colors[3]),
    ]
    users: list[User] = []
    for email, name, title, color in users_data:
        u = User(
            email=email,
            full_name=name,
            hashed_password=hash_password("password123"),
            job_title=title,
            avatar_color=color,
        )
        db.add(u)
        users.append(u)
    db.flush()

    today = date.today()
    projects_spec = [
        {
            "name": "Customer Portal Redesign",
            "key": "CPR",
            "description": "Rebuild the customer-facing portal with faster onboarding, billing clarity, and self-serve support.",
            "status": ProjectStatus.active,
            "priority": ProjectPriority.high,
            "start_date": today - timedelta(days=30),
            "target_date": today + timedelta(days=60),
            "budget": 25000000,
            "owner": users[0],
            "members": [(users[1], MemberRole.member), (users[2], MemberRole.member), (users[3], MemberRole.member)],
        },
        {
            "name": "Payments Infrastructure",
            "key": "PAY",
            "description": "Stabilize payment webhooks, add retry queues, and improve reconciliation reporting.",
            "status": ProjectStatus.active,
            "priority": ProjectPriority.critical,
            "start_date": today - timedelta(days=14),
            "target_date": today + timedelta(days=45),
            "budget": 18000000,
            "owner": users[0],
            "members": [(users[1], MemberRole.admin), (users[3], MemberRole.member)],
        },
        {
            "name": "Mobile App v2",
            "key": "MOB",
            "description": "Ship offline mode, push notifications, and redesigned navigation for iOS and Android.",
            "status": ProjectStatus.planning,
            "priority": ProjectPriority.medium,
            "start_date": today + timedelta(days=7),
            "target_date": today + timedelta(days=120),
            "budget": 32000000,
            "owner": users[2],
            "members": [(users[0], MemberRole.admin), (users[1], MemberRole.member)],
        },
    ]

    tasks_by_key: dict[str, list[dict]] = {
        "CPR": [
            ("Audit current onboarding funnel", TaskStatus.done, TaskPriority.high, TaskType.task, users[1], 5, -10),
            ("Design new billing overview", TaskStatus.in_review, TaskPriority.high, TaskType.story, users[2], 8, 5),
            ("Implement SSO login", TaskStatus.in_progress, TaskPriority.highest, TaskType.task, users[1], 13, 12),
            ("Write help-center content", TaskStatus.todo, TaskPriority.medium, TaskType.task, users[2], 3, 20),
            ("Fix invoice PDF edge cases", TaskStatus.blocked, TaskPriority.high, TaskType.bug, users[3], 5, 3),
            ("Define MVP acceptance criteria", TaskStatus.done, TaskPriority.medium, TaskType.story, users[0], 2, -20),
            ("Build notification preferences", TaskStatus.todo, TaskPriority.low, TaskType.task, users[1], 5, 30),
            ("Accessibility review pass", TaskStatus.backlog, TaskPriority.medium, TaskType.task, users[3], 3, 40),
        ],
        "PAY": [
            ("Map webhook failure modes", TaskStatus.done, TaskPriority.high, TaskType.task, users[1], 5, -5),
            ("Build durable retry queue", TaskStatus.in_progress, TaskPriority.highest, TaskType.epic, users[1], 21, 14),
            ("Add reconciliation dashboard", TaskStatus.todo, TaskPriority.high, TaskType.story, users[0], 8, 21),
            ("Cover refund race conditions", TaskStatus.in_review, TaskPriority.high, TaskType.bug, users[3], 5, 7),
            ("Document ops runbook", TaskStatus.todo, TaskPriority.medium, TaskType.task, users[3], 2, 28),
        ],
        "MOB": [
            ("Competitive research synthesis", TaskStatus.todo, TaskPriority.medium, TaskType.task, users[2], 3, 14),
            ("Offline sync architecture RFC", TaskStatus.backlog, TaskPriority.high, TaskType.epic, users[1], 8, 21),
            ("Navigation prototype", TaskStatus.in_progress, TaskPriority.medium, TaskType.story, users[2], 5, 10),
        ],
    }

    for spec in projects_spec:
        project = Project(
            name=spec["name"],
            key=spec["key"],
            description=spec["description"],
            status=spec["status"],
            priority=spec["priority"],
            start_date=spec["start_date"],
            target_date=spec["target_date"],
            budget=spec["budget"],
            owner_id=spec["owner"].id,
        )
        db.add(project)
        db.flush()
        db.add(ProjectMember(project_id=project.id, user_id=spec["owner"].id, role=MemberRole.owner))
        for member, role in spec["members"]:
            db.add(ProjectMember(project_id=project.id, user_id=member.id, role=role))

        label_defs = [
            ("Frontend", "#0D9488"),
            ("Backend", "#0369A1"),
            ("Design", "#B45309"),
            ("Urgent", "#BE123C"),
        ]
        labels = []
        for name, color in label_defs:
            lab = Label(project_id=project.id, name=name, color=color)
            db.add(lab)
            labels.append(lab)
        db.flush()

        for idx, (title, status, priority, ttype, assignee, points, due_offset) in enumerate(
            tasks_by_key[project.key], start=1
        ):
            task = Task(
                project_id=project.id,
                number=idx,
                title=title,
                description=f"Production-ready work item for {project.name}: {title}.",
                status=status,
                priority=priority,
                type=ttype,
                story_points=points,
                due_date=today + timedelta(days=due_offset),
                position=idx,
                assignee_id=assignee.id,
                reporter_id=spec["owner"].id,
            )
            task.labels = [labels[idx % len(labels)]]
            db.add(task)
            db.flush()
            if idx == 1:
                db.add(
                    Comment(
                        task_id=task.id,
                        author_id=users[0].id,
                        body="Looks good to merge after one more QA pass on staging.",
                    )
                )

        db.add(
            Activity(
                project_id=project.id,
                actor_id=spec["owner"].id,
                action="created",
                entity_type="project",
                entity_id=project.id,
                message=f"Created project {project.key}",
            )
        )

    db.commit()
