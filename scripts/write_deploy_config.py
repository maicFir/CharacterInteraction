"""Serialize GitHub environment configuration as JSON; never render keys in shell source."""

import json
import os
import re
from pathlib import Path

# Validate the host port before creating any secret-bearing output.
port = os.environ.get("API_HOST_PORT") or "18473"
if not re.fullmatch(r"[0-9]+", port) or not 1024 <= int(port) <= 65535:
    raise SystemExit("API_HOST_PORT must be an integer between 1024 and 65535")
port = str(int(port))
release_sha = os.environ.get("GITHUB_SHA", "")
if release_sha and not re.fullmatch(r"[a-f0-9]{40}", release_sha):
    raise SystemExit("GITHUB_SHA must be a full commit SHA")
image = f"after-rain-api:{release_sha or 'latest'}"


required = ["OPENROUTER_API_KEY", "ALLOWED_ORIGINS"]
for name in required:
    if not os.environ.get(name, "").strip():
        raise SystemExit(f"Missing required secret/variable: {name}")
defaults = {
    "LLM_PROVIDER": "openrouter",
    "OPENROUTER_MODEL": "openrouter/free",
    "STT_PROVIDER": "local",
    "TTS_PROVIDER": "local",
    "PIPER_MODEL": "/models/piper/zh_CN-huayan-medium.onnx",
    "WHISPER_MODEL": "tiny",
    "OPENROUTER_STRUCTURED": "false",
    "TURN_TIMEOUT": "90",
}
keys = required + [
    "OPENROUTER_MODEL",
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
    f"API_DOMAIN={domain}\nHF_ENDPOINT={endpoint}\nMANAGED_HTTPS={managed}\nAPI_HOST_PORT={port}\nAPI_IMAGE={image}\n"
)

# Review and install this dedicated server block in the existing Nginx separately.
proxy = Path("infra/nginx.example.conf").read_text()
Path("infra/nginx.generated.conf").write_text(
    proxy.replace("127.0.0.1:18473", f"127.0.0.1:{port}").replace("api.example.com", domain)
)
