"""Verify the local speech pipeline without any LLM key, microphone, or external user recording."""

import asyncio
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "apps/api"))
from app.core.config import Settings  # noqa: E402 -- standalone CLI bootstraps the API package
from app.infrastructure.providers import Providers  # noqa: E402


async def main():
    provider = Providers(
        Settings(_env_file=None, piper_model=str(root / "models/piper/zh_CN-huayan-medium.onnx"))
    )
    try:
        speech = await provider.synthesize("你好，我叫米拉。窗外的雨还没有停。")
        assert speech[:4] == b"RIFF" and len(speech) > 10000
        text = await provider.transcribe(speech)
        assert text.strip()
        print(f"Local Piper → WAV → FFmpeg → Whisper passed. Recognized: {text}")
    finally:
        await provider.close()


asyncio.run(main())
