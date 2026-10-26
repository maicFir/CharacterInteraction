import asyncio
import secrets
import time

import httpx

from ..core.config import Settings
from ..core.errors import BusinessError, ProviderError
from ..models.session import Session, StaleTurn
from .contracts import ModelProviders
from .events import EventPublisher


class InteractionService:
    """One turn's STT → LLM → TTS orchestration, cancellation and failure policy."""

    def __init__(self, settings: Settings, providers: ModelProviders, events: EventPublisher):
        self.settings = settings
        self.providers = providers
        self.events = events
        self.slots = asyncio.Semaphore(settings.max_model_jobs)

    def submit(
        self, session: Session, turn: int, *, text: str | None = None, audio: bytes | None = None
    ):
        if text is not None and not text.strip():
            raise BusinessError("invalid_input", "请输入一些内容。")
        if audio is not None and (not audio or len(audio) > 3_000_000):
            raise BusinessError("invalid_audio", "录音为空或过大，请录制20秒以内的语音。")
        if not session.socket:
            raise BusinessError("not_connected", "实时连接尚未就绪，请重新连接。")
        if time.monotonic() - session.last_request < 0.4:
            raise BusinessError("too_fast", "发送过快，请稍等片刻。")
        try:
            session.begin(turn)
        except StaleTurn as exc:
            raise BusinessError("stale_turn", str(exc)) from exc
        session.last_request = time.monotonic()
        session.task = asyncio.create_task(
            self._run(session, turn, text=text.strip() if text else None, audio=audio)
        )
        return {"accepted": True, "turn_id": turn}

    async def _run(self, session: Session, turn: int, *, text: str | None, audio: bytes | None):
        publish = self.events.publish
        try:
            async with asyncio.timeout(self.settings.turn_timeout):
                async with self.slots:
                    if not session.current(turn):
                        return
                    await publish(
                        session,
                        turn,
                        "state",
                        {"phase": "thinking", "stage": "识别语音" if audio else "整理思绪"},
                    )
                    if audio is not None:
                        text = await self.providers.transcribe(audio)
                        if not session.current(turn):
                            return
                        await publish(session, turn, "recognized", {"text": text})
                    reply = await self.providers.reply(text or "", list(session.history))
                    if not session.current(turn):
                        return
                    await publish(
                        session, turn, "state", {"phase": "thinking", "stage": "准备声音"}
                    )
                    wav = await self.providers.synthesize(reply.text)
                    if not session.current(turn):
                        return
                    audio_id = secrets.token_urlsafe(18)
                    session.audio[audio_id] = (turn, wav)
                    session.pending = (turn, text, reply.text)
                    await publish(
                        session,
                        turn,
                        "reply.ready",
                        {
                            **reply.model_dump(),
                            "audio_path": f"/api/sessions/{session.id}/audio/{audio_id}",
                        },
                    )
        except asyncio.CancelledError:
            return
        except TimeoutError:
            await publish(session, turn, "error", {"message": "这次回复超时了，请重新发送。"})
        except ProviderError as exc:
            await publish(session, turn, "error", {"message": str(exc)})
        except httpx.HTTPStatusError as exc:
            await publish(
                session,
                turn,
                "error",
                {
                    "message": f"模型服务暂时不可用（HTTP {exc.response.status_code}），请检查配置或重试。"
                },
            )
        except Exception:
            await publish(
                session, turn, "error", {"message": "语音或模型服务连接失败，请重试或切换 Mock。"}
            )
