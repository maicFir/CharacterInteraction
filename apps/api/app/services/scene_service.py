import asyncio
import time
import uuid
from collections import defaultdict, deque

import httpx

from ..core.errors import BusinessError, ProviderError


class SceneService:
    def __init__(self, settings, models, providers):
        self.settings = settings
        self.models = models
        self.providers = providers
        self.slots = asyncio.Semaphore(settings.max_model_jobs)
        self.requests = defaultdict(deque)

    async def generate(self, client_id, prompt, model_id=None):
        if not self.settings.llm_ready:
            raise BusinessError("unconfigured", "请先配置后端模型服务密钥。")
        now = time.monotonic()
        for key in list(self.requests):
            while self.requests[key] and now - self.requests[key][0] >= 60:
                self.requests[key].popleft()
            if not self.requests[key]:
                del self.requests[key]
        if len(self.requests) >= 512 and client_id not in self.requests:
            raise BusinessError("busy", "场景生成繁忙，请稍后重试。")
        recent = self.requests[client_id]
        if len(recent) >= 3:
            raise BusinessError("too_fast", "场景生成每分钟最多3次，请稍后重试。")
        recent.append(now)
        try:
            async with asyncio.timeout(self.settings.turn_timeout):
                async with self.slots:
                    selection = await self.models.select(model_id)
                    result = await self.providers.generate_scene(
                        prompt,
                        model_id=selection.model_id,
                        response_format=selection.response_format,
                        supported_parameters=selection.supported_parameters,
                    )
                    return result.model_copy(update={"id": "generated-" + uuid.uuid4().hex})
        except BusinessError:
            raise
        except ProviderError as error:
            raise BusinessError("generation_failed", str(error)) from error
        except (httpx.HTTPError, TimeoutError) as error:
            raise BusinessError(
                "generation_failed", "模型服务不可用或生成超时，请重试或更换模型。"
            ) from error
        except Exception as error:
            raise BusinessError(
                "generation_failed", "场景数据格式不完整，请重新生成或更换模型。"
            ) from error
