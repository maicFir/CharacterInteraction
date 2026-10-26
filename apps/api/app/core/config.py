import json
import os
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")
    app_env: Literal["development", "test", "production"] = "development"
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    llm_provider: Literal["openrouter", "compatible", "ollama"] = "openrouter"
    openrouter_api_key: str = ""
    openrouter_model: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_structured: bool = False
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    stt_provider: Literal["local", "compatible"] = "local"
    stt_base_url: str = ""
    stt_api_key: str = ""
    stt_model: str = "whisper-1"
    whisper_model: str = "tiny"
    tts_provider: Literal["local", "compatible"] = "local"
    tts_base_url: str = ""
    tts_api_key: str = ""
    tts_model: str = "tts-1"
    tts_voice: str = "alloy"
    piper_model: str = "/models/piper/zh_CN-huayan-medium.onnx"
    turn_timeout: float = Field(default=90, ge=1, le=300)
    session_ttl: int = 1800
    max_sessions: int = 100
    max_model_jobs: int = 2

    @property
    def origins(self):
        return [x.strip().rstrip("/") for x in self.allowed_origins.split(",") if x.strip()]

    @property
    def llm_ready(self):
        if self.llm_provider == "openrouter":
            return bool(self.openrouter_api_key and self.openrouter_model)
        return bool(self.llm_base_url and self.llm_model)


def load_settings():
    path = os.environ.get("APP_CONFIG_FILE")
    if path:
        # Production configuration arrives as a read-only JSON secret, not shell code.
        values = json.loads(Path(path).read_text())
        data = {key.lower(): value for key, value in values.items()}
        return Settings(_env_file=None, **{**data, "app_env": "production"})
    environment = os.environ.get("APP_ENV", "development")
    if environment not in {"development", "test", "production"}:
        raise ValueError("APP_ENV must be development, test or production")
    settings = Settings(
        _env_file=(API_ROOT / ".env", API_ROOT / f".env.{environment}"),
        app_env=environment,
    )
    # Relative local paths never depend on the caller's working directory.
    if not Path(settings.piper_model).is_absolute():
        settings.piper_model = str((API_ROOT / settings.piper_model).resolve())
    return settings
