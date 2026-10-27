from typing import Protocol

from ..models.scene import Reply


class ModelProviders(Protocol):
    async def reply(
        self,
        text: str,
        history: list,
        *,
        model_id=None,
        response_format=None,
        supported_parameters=None,
        system_prompt=None,
    ) -> Reply: ...
    async def generate_scene(self, prompt: str, **kwargs): ...
    async def transcribe(self, data: bytes) -> str: ...
    async def synthesize(self, text: str) -> bytes: ...
    async def close(self) -> None: ...
