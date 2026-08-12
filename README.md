# Project-mgt
cd "D:\React-V2\cursor-project-mgt-tool\Project-mgt-main\Project-mgt"
& ".\.venv\Scripts\Activate.ps1"
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

cd "D:\React-V2\cursor-project-mgt-tool\Project-mgt-main\Project-mgt\frontend"
npm install
npm run dev -- --host 0.0.0.0 --port 5173