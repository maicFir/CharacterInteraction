import secrets
import time

from ..core.config import Settings
from ..core.errors import BusinessError
from ..models.session import Session


class SessionRepository:
    """In-memory storage, authentication and expiry, isolated from HTTP."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.sessions: dict[str, Session] = {}
        self.creation_times: dict[str, list[float]] = {}

    def create(self, client_id: str) -> Session:
        now = time.monotonic()
        recent = [t for t in self.creation_times.get(client_id, []) if now - t < 60]
        if len(self.sessions) >= self.settings.max_sessions or len(recent) >= 12:
            raise BusinessError("busy", "演示服务繁忙，请稍后重试。")
        self.creation_times[client_id] = [*recent, now]
        session = Session()
        self.sessions[session.id] = session
        return session

    def authenticate(self, session_id: str, token: str) -> Session:
        session = self.sessions.get(session_id)
        if not session or not token or not secrets.compare_digest(session.token, token):
            raise BusinessError("not_found", "会话不存在或已过期，请重新连接。")
        if time.monotonic() - session.touched > self.settings.session_ttl:
            raise BusinessError("expired", "会话已过期，请重新连接。")
        session.touched = time.monotonic()
        return session

    def remove(self, session: Session):
        self.sessions.pop(session.id, None)

    def expired(self) -> list[Session]:
        now = time.monotonic()
        for client, times in list(self.creation_times.items()):
            recent = [t for t in times if now - t < 60]
            if recent:
                self.creation_times[client] = recent
            else:
                del self.creation_times[client]
        return [s for s in self.sessions.values() if now - s.touched > self.settings.session_ttl]
