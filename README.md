# Atlas PM

Production-style project management tool built with **React + Vite** (frontend) and **FastAPI** (backend).

## Features

- JWT authentication (register / login)
- Projects with production fields: key, status, priority, start/target dates, budget, owner, visibility
- Project members with roles (owner, admin, member, viewer)
- Tasks/issues with type, status, priority, story points, assignee, labels, due dates
- Kanban board with drag-and-drop status moves
- Comments and activity feed
- Dashboard with open/overdue work and recent activity
- Seeded demo workspace for immediate exploration

## Quick start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://127.0.0.1:5173

The Vite dev server proxies `/api` to the FastAPI backend.

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| alex@atlas.dev | password123 | Engineering Manager |
| sam@atlas.dev | password123 | Full-stack Engineer |
| jordan@atlas.dev | password123 | Product Designer |
| morgan@atlas.dev | password123 | QA Lead |

## Project model (production-style)

| Field | Description |
|-------|-------------|
| `name` | Display name |
| `key` | Short uppercase code (e.g. `CPR`) used in issue keys |
| `description` | Project summary |
| `status` | planning / active / on_hold / completed / archived |
| `priority` | low / medium / high / critical |
| `start_date` / `target_date` | Delivery window |
| `budget` | Stored in cents |
| `owner` + `members` | Ownership and collaboration roles |
| `labels` | Project-scoped tags for tasks |

Tasks use `{KEY}-{number}` issue keys (e.g. `CPR-3`) with statuses suitable for delivery boards.

## Environment

Backend settings (optional `.env` in `backend/`):

- `DATABASE_URL` — default SQLite `sqlite:///./atlas_pm.db` (Postgres-ready)
- `SECRET_KEY` — JWT signing secret
- `CORS_ORIGINS` — comma-separated frontend origins

Frontend optional:

- `VITE_API_URL` — defaults to `/api/v1` (proxied in development)

## API overview

- `POST /api/v1/auth/register|login`
- `GET /api/v1/dashboard`
- `CRUD /api/v1/projects`
- `GET/POST /api/v1/projects/{id}/tasks`
- `PATCH/POST/DELETE /api/v1/tasks/{id}`
- Comments, members, labels, activity endpoints under the same prefix
