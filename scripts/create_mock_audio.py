"""Generate offline demo WAVs using a locally supplied Piper voice.

Usage: apps/api/.venv/bin/python scripts/create_mock_audio.py --model models/piper/zh_CN-huayan-medium.onnx
Review the selected voice's MODEL_CARD before redistributing generated audio.
"""

import argparse
import re
import wave
from pathlib import Path

from piper import PiperVoice

parser = argparse.ArgumentParser()
parser.add_argument("--model", required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = (root / "apps/web/src/features/scene/model/turns.ts").read_text()
lines = re.findall(r"text:\s*'([^']+)'[\s\S]*?clip:\s*'([^']+)'", source)
assert len(lines) == 6, "Mock script changed: verify audio/text mappings before regenerating."
out = root / "apps/web/public/audio"
out.mkdir(parents=True, exist_ok=True)
voice = PiperVoice.load(args.model)
for text, clip in lines:
    with wave.open(str(out / f"{clip}.wav"), "wb") as wav:
        voice.synthesize_wav(text, wav)
    print(f"{clip}: {text}")
