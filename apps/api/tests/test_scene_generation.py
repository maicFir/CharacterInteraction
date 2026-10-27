import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from test_api import FakeProviders, config

from app.main import create_app
from app.models.requests import SessionInput
from app.models.scene_definition import SceneDefinition


def scene():
    return json.loads(
        (Path(__file__).resolve().parents[3] / "packages/contracts/scenes.json").read_text()
    )[1]


def test_scene_schema_rejects_unsafe_colors_and_incomplete_role():
    data = scene()
    data["palette"]["outfit"] = "url(https://untrusted.test/image)"
    with pytest.raises(ValidationError):
        SceneDefinition.model_validate(data)
    with pytest.raises(ValidationError):
        SceneDefinition.model_validate({"title": "missing fields"})


def test_generated_scene_is_validated_and_bound_to_session():
    class Provider(FakeProviders):
        async def generate_scene(self, prompt, **kwargs):
            assert prompt == "一家温暖的旧书店等待来客"
            return SceneDefinition.model_validate(scene())

    with TestClient(create_app(config(), Provider())) as client:
        response = client.post("/api/scenes/generate", json={"prompt": "一家温暖的旧书店等待来客"})
        assert response.status_code == 200
        data = response.json()
        assert data["character"]["name"] != "Mira"
        session = client.post("/api/sessions", json={"scene": data}).json()
        stored = client.app.state.services.sessions.repository.sessions[session["id"]]
        assert stored.scene.character.name == data["character"]["name"]
        assert SessionInput.model_validate({"scene": data}).scene.location == data["location"]
        assert client.post("/api/scenes/generate", json={"prompt": " "}).status_code == 422


def test_all_mock_presets_match_the_backend_contract():
    rows = json.loads(
        (Path(__file__).resolve().parents[3] / "packages/contracts/scenes.json").read_text()
    )
    assert len(rows) >= 3
    for row in rows:
        definition = SceneDefinition.model_validate(row)
        assert definition.character.name in definition.conversation_prompt()


def test_bad_generated_scene_is_recoverable_and_rate_limited():
    class Provider(FakeProviders):
        async def generate_scene(self, prompt, **kwargs):
            from app.core.errors import ProviderError

            raise ProviderError("模型回复不符合场景 JSON 格式")

    with TestClient(create_app(config(), Provider())) as client:
        for _ in range(3):
            response = client.post(
                "/api/scenes/generate", json={"prompt": "一家温暖的旧书店等待来客"}
            )
            assert response.status_code == 502
        assert (
            client.post(
                "/api/scenes/generate", json={"prompt": "一家温暖的旧书店等待来客"}
            ).status_code
            == 429
        )
