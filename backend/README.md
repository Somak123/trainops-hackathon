# TrainOps Brain (FastAPI + SQLite)

Control plane API for the TrainOps hackathon: creates fine-tuning jobs, provisions DigitalOcean GPU droplets via `infra/do_manager.py`, tracks status in SQLite, and tears down droplets when the worker calls `POST /webhook/complete`.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
python3 -m pip install -r requirements.txt
cp .env.example .env
# Edit .env — see Environment Variables below
```

## Run

Start from the **`backend/`** directory (so the SQLite path resolves correctly):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

> **"Address already in use"?** Kill the old process first:
> ```bash
> lsof -ti :8000 | xargs kill -9
> ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DO_TOKEN` | For real droplets | DigitalOcean personal access token (needs Droplet create + delete scope). Generate at **cloud.digitalocean.com → API → Tokens**. |
| `PUBLIC_BACKEND_URL` | For real droplets | Public base URL of this API (e.g. ngrok HTTPS URL, **no trailing slash**). The worker curls `{PUBLIC_BACKEND_URL}/webhook/complete`. Set to `http://127.0.0.1:8000` for local-only testing. |
| `DATABASE_URL` | No (default works) | SQLAlchemy URL. Default: `sqlite:///./trainops.db` (file created in cwd). |
| `WEBHOOK_SECRET` | No | If set, `POST /webhook/complete` requires header `X-Webhook-Secret: <value>`. Leave empty for the demo. |
| `CORS_ORIGINS` | No (default works) | Comma-separated origins. Default: `http://localhost:3000,http://127.0.0.1:3000` (for Risham's Next.js frontend). |

## Job Status Lifecycle

```
Queued → Provisioning → Training → Completed
                ↘                    ↗
                  Failed ←──────────
```

| Status | Meaning |
|--------|---------|
| **Queued** | Job created, background task about to start |
| **Provisioning** | Calling DO API to create the droplet |
| **Training** | Droplet is up and running the worker script |
| **Completed** | Worker called `/webhook/complete` with `"success"`; droplet destroyed |
| **Failed** | DO API error, worker reported failure, or unexpected crash; best-effort droplet cleanup |

## API Endpoints

### `GET /health`

```bash
curl -s http://127.0.0.1:8000/health
# → {"status":"ok"}
```

---

### `POST /train`

Start a fine-tuning job. Returns **202 Accepted** and kicks off provisioning in the background.

**Request:**

```json
{
  "model": "llama-3-8b",
  "dataset_url": "https://my-bucket.nyc3.digitaloceanspaces.com/datasets/data.jsonl",
  "job_name": "my-finetune-run-1"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `model` | string (enum) | Yes | `llama-3-8b`, `mistral-7b`, or `tinyllama-1.1b` |
| `dataset_url` | string (URL) | Yes | HTTPS URL to the `.jsonl` dataset on DO Spaces |
| `job_name` | string | No | Display name; auto-generated like `train-9a1b3c4d` if omitted |

**Response (202):**

```json
{
  "job_id": "9a1b3c4d-...-uuid",
  "status": "Queued",
  "created_at": "2026-05-12T20:22:00.000000Z"
}
```

**curl:**

```bash
curl -s -X POST http://127.0.0.1:8000/train \
  -H "Content-Type: application/json" \
  -d '{"model":"tinyllama-1.1b","dataset_url":"https://example.com/d.jsonl"}'
```

---

### `GET /status/{job_id}`

Poll a single job. Frontend should call this every ~3 seconds.

**Response (200):**

```json
{
  "job_id": "9a1b3c4d-...-uuid",
  "job_name": "my-finetune-run-1",
  "model": "llama-3-8b",
  "dataset_url": "https://...",
  "status": "Training",
  "current_step": "Fine-tuning model",
  "progress": 65,
  "weights_url": null,
  "error": null,
  "droplet_id": 123456789,
  "created_at": "2026-05-12T20:22:00.000000Z",
  "started_at": "2026-05-12T20:22:03.000000Z",
  "completed_at": null
}
```

| Field | Notes |
|-------|-------|
| `status` | One of: `Queued`, `Provisioning`, `Training`, `Completed`, `Failed` |
| `current_step` | Human-readable label for the UI progress bar |
| `progress` | 0–100, computed server-side from status + current_step |
| `weights_url` | Populated when `Completed` (URL to exported model on DO Spaces) |
| `error` | Populated when `Failed` |
| `droplet_id` | Set after provisioning; `null` before |

**curl:**

```bash
curl -s "http://127.0.0.1:8000/status/JOB_ID_HERE"
```

Returns **404** if `job_id` doesn't exist.

---

### `GET /jobs`

List all jobs, newest first. For the dashboard.

| Query param | Default | Description |
|-------------|---------|-------------|
| `limit` | 20 | 1–100 |
| `offset` | 0 | Pagination offset |

**Response (200):**

```json
{
  "items": [ /* same shape as GET /status/{job_id} */ ],
  "total": 7
}
```

**curl:**

```bash
curl -s "http://127.0.0.1:8000/jobs?limit=10&offset=0"
```

---

### `POST /webhook/complete`

Called by the **worker script** running inside the droplet when training finishes. **Do not change the payload shape** — it matches `infra/worker_payload.py`.

**Request:**

```json
{
  "job_id": "9a1b3c4d-...-uuid",
  "status": "success"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `job_id` | string | UUID from `POST /train` |
| `status` | string | `"success"` or `"failed"` |
| `weights_url` | string (optional) | URL to exported model weights |
| `error` | string (optional) | Error message when status is `"failed"` |

If `WEBHOOK_SECRET` is set in `.env`, the caller must include:
`-H "X-Webhook-Secret: <value>"`

**Response (200):**

```json
{ "ok": true }
```

The handler is **idempotent** — calling it on an already-completed job returns `{"ok": true}` without re-destroying.

**curl (simulate worker locally):**

```bash
curl -s -X POST http://127.0.0.1:8000/webhook/complete \
  -H "Content-Type: application/json" \
  -d '{"job_id":"JOB_ID_HERE","status":"success"}'
```

## Testing Without a DO Token

You can test the full API shape locally without provisioning real droplets:

1. Start the server (leave `DO_TOKEN` empty in `.env`)
2. `POST /train` — returns **202**, job is created as **Queued**
3. The background task will **fail** at `create_worker_droplet` → job moves to **Failed** (expected)
4. To test the happy path, simulate the webhook manually:
   - Note the `job_id` from step 2
   - `POST /webhook/complete` with `{"job_id":"...","status":"success"}`
   - `GET /status/{job_id}` → should show **Completed** (or **Failed** if the job already failed before you hit the webhook)

## Droplet Callback (ngrok)

For real end-to-end runs where the droplet needs to call back to your laptop:

```bash
ngrok http 8000
```

Copy the **https** URL (e.g. `https://abc123.ngrok-free.app`), set it as `PUBLIC_BACKEND_URL` in `.env` (no trailing slash), and restart uvicorn.

## For Risham (Frontend Integration)

- **CORS** allows `http://localhost:3000` and `http://127.0.0.1:3000` by default.
- Poll `GET /status/{job_id}` every **3 seconds** — `progress` and `current_step` are precomputed server-side.
- Dataset upload goes directly from the browser to **DO Spaces** (hardcode Spaces creds in `.env.local` for the demo). The backend only receives the resulting object URL in `dataset_url`.
- All timestamps are **UTC ISO 8601**.
