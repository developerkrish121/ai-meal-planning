# AI-Based Food Nutrition Analysis and Personalized Meal Planning Platform

This project will provide AI-assisted food analysis and personalized meal planning. This repository currently contains only the initial application foundation; product features have not been implemented.

## Current architecture

- `frontend/` — browser application and future user interface
- `backend/` — REST API and future application/business logic
- `ai-service/` — isolated Python service for future AI workloads
- PostgreSQL — future persistent data store, modeled through Prisma
- `docs/` — project documentation

The frontend will call the Express API. The Express API will own application data and coordinate with the AI service when AI features are introduced.

## Technology stack

- React, Vite, TypeScript, and Tailwind CSS
- Node.js, Express, and TypeScript
- PostgreSQL and Prisma ORM
- Python and FastAPI

## Prerequisites

- Node.js 20 or newer and npm
- Python 3.11 or newer
- PostgreSQL (required when database-backed features or Prisma migrations are introduced)

Copy `.env.example` to `.env` at the repository root and adjust values for your local environment. The backend also reads the root `.env` file. Never commit a populated environment file.

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite development server prints its local URL, normally `http://localhost:5173`.

## Run the backend

```bash
cd backend
npm install
npm run dev
```

The backend defaults to `http://localhost:5000`. Check it at `GET http://localhost:5000/api/health`.

Useful backend commands:

```bash
npm run build
npm run prisma:generate
```

## Run the AI service

Create and activate a virtual environment, then install and run the service:

```bash
cd ai-service
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check it at `GET http://localhost:8000/health`.

## Current development status

Foundation only. The repository has runnable service shells and health endpoints. Authentication, food recognition, nutrition calculations, meal planning, recommendations, and dashboard functionality are intentionally not implemented yet.

