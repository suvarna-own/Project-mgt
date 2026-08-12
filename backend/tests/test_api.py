import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.seed import seed_if_empty


@pytest.fixture(scope="module")
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    with TestClient(app) as c:
        yield c


def test_health(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_dashboard_and_projects(client: TestClient):
    res = client.get("/api/v1/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert data["project_count"] >= 1
    assert data["open_tasks"] >= 1

    projects = client.get("/api/v1/projects")
    assert projects.status_code == 200
    assert len(projects.json()) >= 1


def test_create_project_and_task(client: TestClient):
    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Release Ops",
            "key": "REL",
            "description": "Release checklist",
            "status": "active",
            "priority": "high",
            "budget": 500000,
        },
    )
    assert project.status_code == 201, project.text
    pid = project.json()["id"]

    task = client.post(
        f"/api/v1/projects/{pid}/tasks",
        json={"title": "Cut release notes", "priority": "high", "type": "task"},
    )
    assert task.status_code == 201, task.text
    assert task.json()["issue_key"] == "REL-1"

    moved = client.post(
        f"/api/v1/tasks/{task.json()['id']}/move",
        json={"status": "in_progress", "position": 0},
    )
    assert moved.status_code == 200
    assert moved.json()["status"] == "in_progress"

    comment = client.post(
        f"/api/v1/tasks/{task.json()['id']}/comments",
        json={"body": "Starting work on this.", "author_name": "Alex"},
    )
    assert comment.status_code == 201
    assert comment.json()["author_name"] == "Alex"
