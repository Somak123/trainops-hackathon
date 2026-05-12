"""Application settings (env + .env)."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    do_token: str = Field(default="", description="DigitalOcean API token")
    public_backend_url: str = Field(
        default="http://127.0.0.1:8000",
        description="Public base URL for worker webhook callbacks",
    )
    webhook_secret: str = Field(
        default="",
        description="If set, POST /webhook/complete must send X-Webhook-Secret",
    )
    database_url: str = Field(
        default="sqlite:///./trainops.db",
        description="SQLAlchemy database URL",
    )
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        description="Comma-separated CORS origins",
    )

    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
