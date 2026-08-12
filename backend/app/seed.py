"""Seed demo data for local development."""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import (
    Activity,
    Comment,
    Label,
    Project,
    ProjectPriority,
    ProjectStatus,
    Task,
    TaskPriority,
    TaskStatus,
    TaskType,
    TeamMember,
)


def seed_if_empty(db: Session) -> None:
    if db.query(TeamMember).first():
        return

    colors = ["#0D9488", "#0369A1", "#B45309", "#BE123C"]
    members_data = [
        ("Alex Rivera", "alex@atlas.dev", "Engineering Manager", colors[0]),
        ("Sam Chen", "sam@atlas.dev", "Full-stack Engineer", colors[1]),
        ("Jordan Lee", "jordan@atlas.dev", "Product Designer", colors[2]),
        ("Morgan Blake", "morgan@atlas.dev", "QA Lead", colors[3]),
    ]
    members: list[TeamMember] = []
    for name, email, title, color in members_data:
        m = TeamMember(full_name=name, email=email, job_title=title, avatar_color=color)
        db.add(m)
        members.append(m)
    db.flush()

    today = date.today()
    projects_spec = [
        {
            "name": "Customer Portal Redesign",
            "key": "CPR",
            "description": "Rebuild the customer-facing portal with faster onboarding and billing clarity.",
            "status": ProjectStatus.active,
            "priority": ProjectPriority.high,
            "start_date": today - timedelta(days=30),
            "target_date": today + timedelta(days=60),
            "budget": 25000000,
        },
        {
            "name": "Payments Infrastructure",
            "key": "PAY",
            "description": "Stabilize payment webhooks, add retry queues, and improve reconciliation.",
            "status": ProjectStatus.active,
            "priority": ProjectPriority.critical,
            "start_date": today - timedelta(days=14),
            "target_date": today + timedelta(days=45),
            "budget": 18000000,
        },
        {
            "name": "Mobile App v2",
            "key": "MOB",
            "description": "Ship offline mode, push notifications, and redesigned navigation.",
            "status": ProjectStatus.planning,
            "priority": ProjectPriority.medium,
            "start_date": today + timedelta(days=7),
            "target_date": today + timedelta(days=120),
            "budget": 32000000,
        },
    ]

    tasks_by_key: dict[str, list[tuple]] = {
        "CPR": [
            ("Audit onboarding funnel", TaskStatus.done, TaskPriority.high, TaskType.task, members[1], 5, -10),
            ("Design billing overview", TaskStatus.in_review, TaskPriority.high, TaskType.story, members[2], 8, 5),
            ("Implement SSO login", TaskStatus.in_progress, TaskPriority.highest, TaskType.task, members[1], 13, 12),
            ("Write help-center content", TaskStatus.todo, TaskPriority.medium, TaskType.task, members[2], 3, 20),
            ("Fix invoice PDF edge cases", TaskStatus.blocked, TaskPriority.high, TaskType.bug, members[3], 5, 3),
        ],
        "PAY": [
            ("Map webhook failure modes", TaskStatus.done, TaskPriority.high, TaskType.task, members[1], 5, -5),
            ("Build durable retry queue", TaskStatus.in_progress, TaskPriority.highest, TaskType.epic, members[1], 21, 14),
            ("Add reconciliation dashboard", TaskStatus.todo, TaskPriority.high, TaskType.story, members[0], 8, 21),
        ],
        "MOB": [
            ("Competitive research synthesis", TaskStatus.todo, TaskPriority.medium, TaskType.task, members[2], 3, 14),
            ("Offline sync architecture RFC", TaskStatus.backlog, TaskPriority.high, TaskType.epic, members[1], 8, 21),
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
        )
        db.add(project)
        db.flush()

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
                description=f"Work item for {project.name}: {title}.",
                status=status,
                priority=priority,
                type=ttype,
                story_points=points,
                due_date=today + timedelta(days=due_offset),
                position=idx,
                assignee_id=assignee.id,
            )
            task.labels = [labels[idx % len(labels)]]
            db.add(task)
            db.flush()
            if idx == 1:
                db.add(
                    Comment(
                        task_id=task.id,
                        author_name=members[0].full_name,
                        body="Looks good to merge after one more QA pass on staging.",
                    )
                )

        db.add(
            Activity(
                project_id=project.id,
                actor_name=members[0].full_name,
                action="created",
                entity_type="project",
                entity_id=project.id,
                message=f"Created project {project.key}",
            )
        )

    db.commit()
