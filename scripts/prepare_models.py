"""Download local speech models once. No LLM download is needed for OpenRouter.

Use HF_ENDPOINT to select a trusted Hugging Face mirror when necessary.
"""

import json
import os
from pathlib import Path

from huggingface_hub import hf_hub_download, snapshot_download

root = Path(os.environ.get("MODEL_DIR", "/models"))
config_path = os.environ.get("APP_CONFIG_FILE")
config = json.loads(Path(config_path).read_text()) if config_path else {}


def option(name, default):
    return config.get(name, config.get(name.lower(), os.environ.get(name, default)))


piper = root / "piper"
piper.mkdir(parents=True, exist_ok=True)
voice = os.environ.get("PIPER_VOICE", "zh_CN-huayan-medium")
if voice != "zh_CN-huayan-medium":
    raise SystemExit("For another voice, download its ONNX + JSON yourself and set PIPER_MODEL.")
if option("TTS_PROVIDER", "local") == "local":
    for suffix in [".onnx", ".onnx.json", ""]:
        filename = (
            f"zh/zh_CN/huayan/medium/{voice}{suffix}"
            if suffix
            else "zh/zh_CN/huayan/medium/MODEL_CARD"
        )
        source = hf_hub_download(
            "rhasspy/piper-voices", filename, cache_dir=str(root / "huggingface")
        )
        target = piper / (voice + suffix if suffix else "MODEL_CARD")
        target.write_bytes(Path(source).read_bytes())
whisper = option("WHISPER_MODEL", "tiny")
if option("STT_PROVIDER", "local") == "local" and "/" not in whisper:
    snapshot_download(f"Systran/faster-whisper-{whisper}", cache_dir=str(root / "huggingface/hub"))
print("Local STT/TTS models prepared. Review Piper MODEL_CARD for voice-specific licensing.")
