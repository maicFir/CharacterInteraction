"""Serialize GitHub environment configuration as JSON; never render keys in shell source."""

import json
import os
import re
from pathlib import Path

required = ["OPENROUTER_API_KEY", "OPENROUTER_MODEL", "ALLOWED_ORIGINS"]
for name in required:
    if not os.environ.get(name, "").strip():
        raise SystemExit(f"Missing required secret/variable: {name}")
defaults = {
    "LLM_PROVIDER": "openrouter",
    "STT_PROVIDER": "local",
    "TTS_PROVIDER": "local",
    "PIPER_MODEL": "/models/piper/zh_CN-huayan-medium.onnx",
    "WHISPER_MODEL": "tiny",
    "OPENROUTER_STRUCTURED": "false",
    "TURN_TIMEOUT": "90",
}
keys = required + [
    "OPENROUTER_STRUCTURED",
    "STT_PROVIDER",
    "STT_BASE_URL",
    "STT_MODEL",
    "STT_API_KEY",
    "TTS_PROVIDER",
    "TTS_BASE_URL",
    "TTS_MODEL",
    "TTS_VOICE",
    "TTS_API_KEY",
    "WHISPER_MODEL",
    "TURN_TIMEOUT",
]
values = {**defaults, **{key: os.environ[key] for key in keys if os.environ.get(key)}}
Path("infra/runtime.json").write_text(json.dumps(values, ensure_ascii=False))
Path("infra/runtime.json").chmod(0o600)
domain = os.environ.get("API_DOMAIN") or "api.example.com"
if not re.fullmatch(r"[a-zA-Z0-9.-]+", domain):
    raise SystemExit("API_DOMAIN must be a hostname without scheme or path")
managed = os.environ.get("MANAGED_HTTPS", "false") or "false"
endpoint = os.environ.get("HF_ENDPOINT") or "https://huggingface.co"
if not re.fullmatch(r"https://[a-zA-Z0-9.-]+", endpoint):
    raise SystemExit("HF_ENDPOINT must be an HTTPS origin")
if managed not in ("true", "false"):
    raise SystemExit("MANAGED_HTTPS must be true or false")
if managed == "true" and domain == "api.example.com":
    raise SystemExit("Set your real API_DOMAIN before enabling managed HTTPS")
Path("infra/domain.env").write_text(
    f"API_DOMAIN={domain}\nHF_ENDPOINT={endpoint}\nMANAGED_HTTPS={managed}\n"
)
