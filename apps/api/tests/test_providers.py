import httpx
import pytest

from app.core.config import Settings
from app.infrastructure.providers import ProviderError, Providers


@pytest.mark.asyncio
async def test_openrouter_model_and_server_key_are_sent_only_to_configured_endpoint():
    def handler(request):
        assert str(request.url) == "https://openrouter.ai/api/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer test-only-key"
        import json

        body = json.loads(request.content)
        assert body["model"] == "configured/model"
        assert body["stream"] is False
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": '{"text":"给你看照片。","emotion":"curious","action":"offer_photo","event":"reveal_photo"}'
                        }
                    }
                ]
            },
        )

    provider = Providers(
        Settings(
            _env_file=None, openrouter_api_key="test-only-key", openrouter_model="configured/model"
        )
    )
    await provider.client.aclose()
    provider.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        reply = await provider.reply("能看看照片吗", [])
        assert reply.event == "reveal_photo"
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_bad_model_json_is_a_recoverable_failure_not_an_unchecked_command():
    provider = Providers(
        Settings(_env_file=None, openrouter_api_key="key", openrouter_model="model")
    )
    await provider.client.aclose()
    provider.client = httpx.AsyncClient(
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                200, json={"choices": [{"message": {"content": "some unstructured response"}}]}
            )
        )
    )
    try:
        with pytest.raises(ProviderError, match="格式"):
            await provider.reply("你好", [])
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_selected_model_is_forwarded_with_its_supported_json_mode():
    def handler(request):
        import json

        body = json.loads(request.content)
        assert body["model"] == "selected/model"
        assert body["response_format"] == {"type": "json_object"}
        assert "temperature" not in body
        return httpx.Response(
            200, json={"choices": [{"message": {"content": '{"text":"你好。"}'}}]}
        )

    provider = Providers(Settings(_env_file=None, openrouter_api_key="test-key"))
    await provider.client.aclose()
    provider.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        reply = await provider.reply(
            "你好",
            [],
            model_id="selected/model",
            response_format="json_object",
            supported_parameters=["response_format"],
        )
        assert reply.text == "你好。"
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_custom_scene_prompt_replaces_default_mira_identity():
    import json
    from pathlib import Path

    from app.models.scene_definition import SceneDefinition

    scene = SceneDefinition.model_validate(
        json.loads(
            (Path(__file__).resolve().parents[3] / "packages/contracts/scenes.json").read_text()
        )[1]
    )

    def handler(request):
        body = json.loads(request.content)
        assert body["messages"][0]["content"] == scene.conversation_prompt()
        assert "林舟" in body["messages"][0]["content"]
        return httpx.Response(
            200, json={"choices": [{"message": {"content": '{"text":"你好，我是林舟。"}'}}]}
        )

    provider = Providers(Settings(_env_file=None, openrouter_api_key="test-key"))
    await provider.client.aclose()
    provider.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        reply = await provider.reply("你是谁", [], system_prompt=scene.conversation_prompt())
        assert "林舟" in reply.text
    finally:
        await provider.close()
