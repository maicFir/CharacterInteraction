import asyncio
import time
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from ..core.errors import BusinessError
from ..models.responses import ModelInfo


@dataclass(frozen=True)
class ModelSelection:
    model_id: str
    response_format: str | None = None
    supported_parameters: list[str] | None = None


class ModelService:
    def __init__(self, settings, client):
        self.settings = settings
        self.client = client
        self._cache = []
        self._expires = 0
        self._lock = asyncio.Lock()

    async def list_models(self):
        if self.settings.llm_provider != "openrouter":
            return []
        async with self._lock:
            if time.monotonic() < self._expires:
                return self._cache
            try:
                rows = await self.client.fetch()
                result = []
                for row in rows:
                    architecture = row.get("architecture", {})
                    if (
                        "text" not in architecture.get("input_modalities", [])
                        or architecture.get("output_modalities", []) != ["text"]
                        or row["id"].endswith(":batch")
                    ):
                        continue
                    pricing = row.get("pricing", {})

                    def price(key):
                        try:
                            value = Decimal(
                                str(pricing.get(key, "0") if key == "request" else pricing[key])
                            )
                            return value if value.is_finite() and value >= 0 else None
                        except (KeyError, InvalidOperation, ValueError):
                            return None

                    prompt, completion, request = (
                        price("prompt"),
                        price("completion"),
                        price("request"),
                    )
                    result.append(
                        ModelInfo(
                            id=row["id"],
                            name=row.get("name", row["id"]),
                            context_length=row.get("context_length") or 0,
                            input_price_per_million=format((prompt * 1000000).normalize(), "f")
                            if prompt is not None
                            else None,
                            output_price_per_million=format((completion * 1000000).normalize(), "f")
                            if completion is not None
                            else None,
                            is_free=prompt == 0 and completion == 0 and request == 0,
                            supported_parameters=row.get("supported_parameters") or [],
                        )
                    )
                self._cache = sorted(result, key=lambda item: (not item.is_free, item.name))
                self._expires = time.monotonic() + 300
                return self._cache
            except Exception as error:
                raise BusinessError(
                    "catalog_unavailable", "模型目录加载失败，请稍后重试。"
                ) from error

    async def select(self, model_id):
        if self.settings.llm_provider != "openrouter":
            if model_id and model_id != self.settings.llm_model:
                raise BusinessError("invalid_model", "当前服务未启用 OpenRouter 模型选择。")
            return ModelSelection(self.settings.llm_model)
        chosen = model_id or self.settings.default_model
        item = next((item for item in await self.list_models() if item.id == chosen), None)
        if item is None:
            raise BusinessError(
                "invalid_model", "模型不在当前 OpenRouter 文本模型目录中，请重新选择。"
            )
        parameters = item.supported_parameters
        mode = (
            "json_schema"
            if self.settings.openrouter_structured and "structured_outputs" in parameters
            else "json_object"
            if "response_format" in parameters
            else None
        )
        return ModelSelection(chosen, mode, parameters)
