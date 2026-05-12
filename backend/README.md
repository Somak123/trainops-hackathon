# TrainOps Brain (FastAPI + SQLite)

Control plane API for the TrainOps hackathon: creates jobs, provisions DigitalOcean workers via `infra/do_manager.py`, and tears down droplets when the worker calls `POST /webhook/complete`.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set DO_TOKEN, PUBLIC_BACKEND_URL (ngrok URL in demos), optional WEBHOOK_SECRET
```

## Run

From the `backend/` directory (so SQLite path resolves correctly):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- OpenAPI / Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Droplet callback (ngrok)

The worker script POSTs to `{PUBLIC_BACKEND_URL}/webhook/complete`. For local dev, expose this app:

```bash
ngrok http 8000
```

Set `PUBLIC_BACKEND_URL` in `.env` to the HTTPS URL ngrok prints (no trailing slash).

## API summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/train` | Start a job (202 + background provisioning) |
| `GET` | `/status/{job_id}` | Poll job state for the dashboard |
| `GET` | `/jobs` | List jobs (newest first) |
| `POST` | `/webhook/complete` | Worker completion callback (matches `infra/worker_payload.py`) |

## Environment

See [.env.example](.env.example). `DO_TOKEN` must be set before real droplet create/destroy calls; the app also sets `os.environ["DO_TOKEN"]` at startup so `infra/do_manager.py` picks it up.
