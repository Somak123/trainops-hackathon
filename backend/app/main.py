"""
TrainOps Brain — FastAPI app.

`infra/` is prepended to sys.path and DO_TOKEN is set before any code imports
`do_manager` (module-level Authorization header).
"""

from __future__ import annotations

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent

sys.path.insert(0, str(REPO_ROOT / "infra"))

load_dotenv(BACKEND_DIR / ".env")
load_dotenv(REPO_ROOT / ".env")

from app.config import get_settings  # noqa: E402

_startup_settings = get_settings()
if _startup_settings.do_token:
    os.environ["DO_TOKEN"] = _startup_settings.do_token

from app.db import init_db  # noqa: E402
from app.routers import train, webhook  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s %(message)s",
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="TrainOps Brain", version="0.1.0", lifespan=lifespan)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(train.router)
app.include_router(webhook.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
