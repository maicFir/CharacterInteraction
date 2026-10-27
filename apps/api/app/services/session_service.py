import asyncio
import contextlib

from ..core.config import Settings
from ..core.errors import BusinessError
from ..models.session import Session
from ..repositories.session_repository import SessionRepository


class SessionService:
    def __init__(self, settings: Settings, repository: SessionRepository, models=None):
        self.models = models
        self.settings = settings
        self.repository = repository
        self._cleaner: asyncio.Task | None = None

    async def create(self, client_id: str, model_id=None, scene=None) -> Session:
        if not self.settings.llm_ready:
            raise BusinessError(
                "unconfigured", "请先配置后端 OpenRouter 密钥和模型 ID，或使用 Mock 模式。"
            )
        selection = await self.models.select(model_id)
        session = self.repository.create(client_id)
        session.scene = scene
        session.model_id = selection.model_id
        session.response_format = selection.response_format
        session.supported_parameters = selection.supported_parameters
        return session

    def authenticate(self, session_id: str, token: str) -> Session:
        return self.repository.authenticate(session_id, token)

    async def close(self, session: Session):
        session.interrupt(10000)
        self.repository.remove(session)
        if session.socket:
            with contextlib.suppress(Exception):
                await session.socket.close()

    def control(self, session: Session, message: dict):
        if message.get("epoch") != session.epoch:
            return
        turn = message.get("turn_id")
        if not isinstance(turn, int) or not 0 <= turn <= 10000:
            return
        if message.get("type") == "interrupt":
            session.interrupt(turn)
        elif message.get("type") == "playback":
            session.acknowledge(turn, message.get("status"))

    def audio(self, session: Session, audio_id: str) -> bytes:
        item = session.audio.get(audio_id)
        if not item or not session.current(item[0]):
            raise BusinessError("not_found", "音频已失效。")
        return item[1]

    def start_cleanup(self):
        self._cleaner = asyncio.create_task(self._cleanup())

    async def shutdown(self):
        if self._cleaner:
            self._cleaner.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._cleaner
        tasks = [s.task for s in self.repository.sessions.values() if s.task]
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _cleanup(self):
        while True:
            await asyncio.sleep(60)
            for session in self.repository.expired():
                await self.close(session)
