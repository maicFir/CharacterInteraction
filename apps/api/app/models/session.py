import asyncio
import secrets
import time
from dataclasses import dataclass, field
from typing import Any

class StaleTurn(ValueError):
    pass

@dataclass
class Session:
    id: str = field(default_factory=lambda: secrets.token_urlsafe(24))
    token: str = field(default_factory=lambda: secrets.token_urlsafe(32))
    epoch: str = field(default_factory=lambda: secrets.token_hex(12))
    turn: int = 0
    invalid_through: int = 0
    touched: float = field(default_factory=time.monotonic)
    last_request: float = 0
    task: asyncio.Task | None = None
    socket: Any = None
    history: list = field(default_factory=list)
    audio: dict = field(default_factory=dict)
    pending: tuple | None = None
    started: bool = False

    def begin(self, turn: int):
        if turn <= max(self.turn, self.invalid_through):
            raise StaleTurn('该轮次已经失效')
        self._flush_partial()
        if self.task and not self.task.done():
            self.task.cancel()
        self.turn = turn
        self.pending = None
        self.started = False
        self.audio.clear()
        self.touched = time.monotonic()

    def interrupt(self, up_to: int):
        if self.turn <= up_to:
            self._flush_partial()
            self.pending = None
            self.started = False
            self.audio.clear()
            if self.task and not self.task.done():
                self.task.cancel()
        self.invalid_through = max(self.invalid_through, up_to)
        self.touched = time.monotonic()

    def current(self, turn: int) -> bool:
        return turn == self.turn and turn > self.invalid_through

    def commit(self, turn: int, user: str, assistant: str) -> bool:
        if not self.current(turn):
            return False
        self.history.extend([{'role': 'user', 'content': user}, {'role': 'assistant', 'content': assistant}])
        self.history = self.history[-16:]
        return True

    def _flush_partial(self):
        if self.pending and self.started:
            turn, user, reply = self.pending
            self.commit(turn, user, '[此回复已开始播放但被打断，用户未必听完] ' + reply)

    def acknowledge(self, turn: int, status: str):
        if not self.current(turn) or not self.pending:
            return
        if status == 'started':
            self.started = True
        elif status == 'ended':
            _, user, reply = self.pending
            self.commit(turn, user, reply)
            self.pending = None
            self.started = False
        self.touched = time.monotonic()
