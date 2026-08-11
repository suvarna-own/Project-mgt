# Planboard

Open-access project management app built with **React 19 + Vite + Tailwind CSS** (frontend) and **FastAPI** (backend). No login required.

## Features

- Dashboard with project stats and open tasks
- Projects with status, priority, budget, and dates
- Kanban board with drag-and-drop
- Task list, detail view, and comments
- Team member assignees (no authentication)

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

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, TypeScript |
| Backend | FastAPI, SQLAlchemy, SQLite |
| API | REST at `/api/v1` |
