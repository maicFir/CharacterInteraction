import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.errors import BusinessError
from app.main import create_app
from app.services.model_service import ModelService


def model(model_id, *, prompt="0", completion="0", output=None, parameters=None):
    return {
        "id": model_id,
        "name": model_id,
        "context_length": 32000,
        "architecture": {"input_modalities": ["text"], "output_modalities": output or ["text"]},
        "pricing": {"prompt": prompt, "completion": completion, "request": "0"},
        "supported_parameters": parameters or ["response_format"],
    }


class FakeCatalog:
    def __init__(self):
        self.calls = 0

    async def fetch(self):
        self.calls += 1
        return [
            model("openrouter/free"),
            model("vendor/chat", prompt="0.000001"),
            model("vendor/image", output=["image"]),
            model("vendor/audio", output=["text", "audio"]),
            model("vendor/chat:batch"),
        ]

    async def close(self):
        pass


def settings():
    return Settings(_env_file=None, openrouter_api_key="private-test-key")


@pytest.mark.asyncio
async def test_catalog_filters_non_chat_models_and_normalizes_prices():
    service = ModelService(settings(), FakeCatalog())
    catalog = await service.list_models()
    assert {item.id for item in catalog} == {"openrouter/free", "vendor/chat"}
    paid = next(item for item in catalog if item.id == "vendor/chat")
    assert paid.input_price_per_million == "1"
    assert not paid.is_free


@pytest.mark.asyncio
async def test_selection_rejects_unknown_model_and_keeps_free_default():
    service = ModelService(settings(), FakeCatalog())
    assert (await service.select(None)).model_id == "openrouter/free"
    with pytest.raises(BusinessError, match="模型"):
        await service.select("unlisted/model")


def test_public_catalog_does_not_expose_keys_and_uses_cache():
    adapter = FakeCatalog()
    with TestClient(create_app(settings(), catalog_client=adapter)) as client:
        response = client.get("/api/models/openrouter")
        assert response.status_code == 200
        assert "private-test-key" not in response.text
        assert response.json()["default_model"] == "openrouter/free"
        client.get("/api/models/openrouter")
        assert adapter.calls == 1


def test_session_model_is_local_to_each_session_and_validated():
    cfg = settings()
    with TestClient(create_app(cfg, catalog_client=FakeCatalog())) as client:
        first = client.post("/api/sessions", json={"model_id": "openrouter/free"}).json()
        second = client.post("/api/sessions", json={"model_id": "vendor/chat"}).json()
        assert first["model_id"] == "openrouter/free"
        assert second["model_id"] == "vendor/chat"
        assert cfg.default_model == "openrouter/free"
        assert client.post("/api/sessions", json={"model_id": "unlisted/model"}).status_code == 422


@pytest.mark.asyncio
async def test_official_catalog_missing_optional_request_price_is_free():
    class Catalog(FakeCatalog):
        async def fetch(self):
            row = model("openrouter/free")
            del row["pricing"]["request"]
            return [row]

    rows = await ModelService(settings(), Catalog()).list_models()
    assert rows[0].is_free
