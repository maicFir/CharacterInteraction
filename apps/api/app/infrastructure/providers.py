import asyncio
import io
import json
import os
import tempfile
import threading
import wave
from pathlib import Path

import httpx

from ..core.config import Settings
from ..core.errors import ProviderError
from ..models.scene import SYSTEM_PROMPT, Reply, constrain


class Providers:
    def __init__(self, settings: Settings):
        self.cfg = settings
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(60, connect=10))
        self._whisper = None
        self._piper = None
        self._stt_lock = threading.Lock()
        self._tts_lock = threading.Lock()
        self._local_slots = asyncio.Semaphore(1)

    async def close(self):
        await self.client.aclose()

    async def _local(self, function, *args):
        # A cancelled HTTP turn must not release the slot while the CPU thread still runs.
        async with self._local_slots:
            task = asyncio.create_task(asyncio.to_thread(function, *args))
            try:
                return await asyncio.shield(task)
            except asyncio.CancelledError:
                try:
                    await task
                except Exception:
                    pass
                raise

    async def reply(
        self,
        text: str,
        history: list,
        *,
        model_id=None,
        response_format=None,
        supported_parameters=None,
        system_prompt=None,
    ) -> Reply:
        messages = [
            {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
            *history,
            {"role": "user", "content": text},
        ]
        result = await self._completion(
            messages, Reply, 600, model_id, response_format, supported_parameters
        )
        return constrain(result, text)

    async def generate_scene(
        self, prompt, *, model_id=None, response_format=None, supported_parameters=None
    ):
        from ..models.scene_definition import SceneDefinition

        instructions = (
            "根据用户描述生成完整的原创成年角色互动场景，所有展示文案用简体中文。角色年龄18–90。"
            "保留用户描述中的人物、地点和情绪，补全未提供细节；不要照搬默认Mira。"
            "visual.setting选择最接近的cafe/bookshop/station模板，外貌与颜色、服装、发型字段保持一致。"
            "只返回符合下列Schema的JSON对象，不要Markdown，不要代码或URL。mock_replies为3条符合角色的离线演示回复。"
            "headline和intro恰好两条短句，topics恰好3个问题，id为简短英文标识。Schema："
            + json.dumps(SceneDefinition.model_json_schema(), ensure_ascii=False)
        )
        return await self._completion(
            [{"role": "system", "content": instructions}, {"role": "user", "content": prompt}],
            SceneDefinition,
            3500,
            model_id,
            response_format,
            supported_parameters,
        )

    async def _completion(
        self, messages, output_type, max_tokens, model_id, response_format, supported_parameters
    ):
        cfg = self.cfg
        if not cfg.llm_ready:
            raise ProviderError("尚未配置 OpenRouter 密钥或模型 ID，请联系部署者配置。")
        if cfg.llm_provider == "ollama":
            response = await self.client.post(
                cfg.llm_base_url.rstrip("/") + "/api/chat",
                json={
                    "model": cfg.llm_model,
                    "messages": messages,
                    "stream": False,
                    "format": output_type.model_json_schema(),
                    "options": {"num_predict": max_tokens},
                },
            )
            response.raise_for_status()
            content = response.json()["message"]["content"]
        else:
            is_router = cfg.llm_provider == "openrouter"
            base = cfg.openrouter_base_url if is_router else cfg.llm_base_url
            key = cfg.openrouter_api_key if is_router else cfg.llm_api_key
            model = (model_id or cfg.default_model) if is_router else cfg.llm_model
            body = {
                "model": model,
                "messages": messages,
                "stream": False,
                "max_tokens": max_tokens,
                "temperature": 0.7,
            }
            if is_router and supported_parameters is not None:
                if "temperature" not in supported_parameters:
                    body.pop("temperature", None)
            if response_format == "json_object":
                body["response_format"] = {"type": "json_object"}
            if response_format == "json_schema" or (
                response_format is None
                and supported_parameters is None
                and cfg.openrouter_structured
            ):
                schema = output_type.model_json_schema()
                schema["required"] = list(schema["properties"])
                body["response_format"] = {
                    "type": "json_schema",
                    "json_schema": {"name": "scene_data", "strict": True, "schema": schema},
                }
            response = await self.client.post(
                base.rstrip("/") + "/chat/completions",
                json=body,
                headers={
                    "Authorization": f"Bearer {key}",
                    "X-Title": "After Rain Character Interaction",
                },
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
        if not isinstance(content, str):
            raise ProviderError("模型没有返回可用文本，请更换文本模型或重试。")
        clean = content.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        try:
            return output_type.model_validate(json.loads(clean))
        except (ValueError, TypeError):
            raise ProviderError("模型回复不符合场景 JSON 格式，请重试或使用支持 JSON 的模型。")

    async def transcribe(self, data: bytes) -> str:
        wav = await self._convert(data)
        if self.cfg.stt_provider == "compatible":
            cfg = self.cfg
            if not cfg.stt_base_url:
                raise ProviderError("尚未配置 STT 接口地址。")
            response = await self.client.post(
                cfg.stt_base_url.rstrip("/") + "/audio/transcriptions",
                headers={"Authorization": f"Bearer {cfg.stt_api_key}"},
                data={"model": cfg.stt_model, "language": "zh"},
                files={"file": ("speech.wav", wav, "audio/wav")},
            )
            response.raise_for_status()
            text = response.json().get("text", "").strip()
        else:
            text = await self._local(self._transcribe_sync, wav)
        if not text:
            raise ProviderError("没有识别到清晰语音，请靠近麦克风后重试。")
        return text[:1000]

    def _transcribe_sync(self, wav: bytes) -> str:
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise ProviderError("本地 STT 未安装，请安装 local 依赖并准备 Whisper 模型。") from exc
        with self._stt_lock:
            if self._whisper is None:
                try:
                    self._whisper = WhisperModel(
                        self.cfg.whisper_model,
                        device="cpu",
                        compute_type="int8",
                        download_root=self.cfg.whisper_download_root,
                        local_files_only=True,
                    )
                except (OSError, ValueError, RuntimeError) as exc:
                    raise ProviderError("本地 STT 模型尚未准备，请先运行模型准备命令。") from exc
            segments, _ = self._whisper.transcribe(
                io.BytesIO(wav), language="zh", beam_size=1, condition_on_previous_text=False
            )
            return "".join(s.text for s in segments).strip()

    async def synthesize(self, text: str) -> bytes:
        cfg = self.cfg
        if cfg.tts_provider == "compatible":
            if not cfg.tts_base_url:
                raise ProviderError("尚未配置 TTS 接口地址。")
            response = await self.client.post(
                cfg.tts_base_url.rstrip("/") + "/audio/speech",
                headers={"Authorization": f"Bearer {cfg.tts_api_key}"},
                json={
                    "model": cfg.tts_model,
                    "voice": cfg.tts_voice,
                    "input": text,
                    "response_format": "wav",
                },
            )
            response.raise_for_status()
            if len(response.content) > 10_000_000:
                raise ProviderError("TTS 返回的音频过大。")
            return await self._convert(response.content, max_seconds=90)
        return await self._local(self._synthesize_sync, text)

    def _synthesize_sync(self, text: str) -> bytes:
        if not Path(self.cfg.piper_model).is_file():
            raise ProviderError("中文语音模型尚未准备，请执行 README 中的模型准备命令。")
        try:
            from piper import PiperVoice
        except ImportError as exc:
            raise ProviderError("本地 TTS 未安装，请安装 local 依赖。") from exc
        with self._tts_lock:
            if self._piper is None:
                self._piper = PiperVoice.load(self.cfg.piper_model)
            output = io.BytesIO()
            with wave.open(output, "wb") as wav:
                self._piper.synthesize_wav(text, wav)
            return output.getvalue()

    async def _convert(self, data: bytes, max_seconds=21) -> bytes:
        # Decode to a bounded WAV; reject recordings longer than the UI limit.
        handle, source = tempfile.mkstemp()
        os.close(handle)
        target = source + ".wav"
        process = None
        try:
            Path(source).write_bytes(data)
            process = await asyncio.create_subprocess_exec(
                "ffmpeg",
                "-nostdin",
                "-v",
                "error",
                "-y",
                "-i",
                source,
                "-t",
                str(max_seconds + 1),
                "-ac",
                "1",
                "-ar",
                "16000",
                target,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await asyncio.wait_for(process.wait(), timeout=15)
            if process.returncode:
                raise ProviderError("无法解码这段音频，请重新录制。")
            result = Path(target).read_bytes()
            with wave.open(io.BytesIO(result)) as wav:
                if wav.getnframes() / wav.getframerate() > max_seconds:
                    raise ProviderError("录音过长，请控制在20秒以内。")
            return result
        except FileNotFoundError as exc:
            raise ProviderError("服务器缺少 FFmpeg 音频解码器。") from exc
        finally:
            if process and process.returncode is None:
                process.kill()
                await process.wait()
            Path(source).unlink(missing_ok=True)
            Path(target).unlink(missing_ok=True)
