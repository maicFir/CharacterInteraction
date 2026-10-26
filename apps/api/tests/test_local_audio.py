"""Optional local speech regression: runs when local dependencies are installed."""

import io
import wave

import pytest


def test_whisper_can_decode_a_valid_pcm_wav():
    audio = pytest.importorskip("faster_whisper.audio")
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"\0\0" * 1600)
    decoded = audio.decode_audio(io.BytesIO(buffer.getvalue()))
    assert len(decoded) == 1600
