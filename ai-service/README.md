# AI Service

Minimal FastAPI foundation for future AI workloads. No analysis or model functionality is implemented yet.

## Run locally

```bash
python -m venv .venv
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check: `GET /health`

