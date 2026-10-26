from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.models.scene import Reply


class FakeProviders:
    async def close(self):
        pass

    async def reply(self, text, history):
        return Reply(text="你好，今晚的雨很温柔。")

    async def synthesize(self, text):
        return b"RIFF-test-audio"

    async def transcribe(self, data):
        return "你好"


def config(**kwargs):
    return Settings(
        _env_file=None,
        llm_provider="ollama",
        llm_base_url="http://local-model",
        llm_model="test",
        **kwargs,
    )


def test_unconfigured_real_mode_never_silently_becomes_mock():
    with TestClient(create_app(Settings(_env_file=None), FakeProviders())) as client:
        result = client.post("/api/sessions")
        assert result.status_code == 503
        assert "Mock" in result.json()["detail"]


def test_session_auth_websocket_reply_audio_and_playback_ack():
    with TestClient(create_app(config(), FakeProviders())) as client:
        s = client.post("/api/sessions").json()
        headers = {"X-Session-Token": s["token"]}
        assert (
            client.post(
                f"/api/sessions/{s['id']}/turns/text", json={"turn_id": 1, "text": "你好"}
            ).status_code
            == 404
        )
        with client.websocket_connect(
            f"/ws/sessions/{s['id']}", headers={"origin": "http://localhost:3000"}
        ) as socket:
            socket.send_json({"token": s["token"]})
            assert socket.receive_json()["type"] == "ready"
            result = client.post(
                f"/api/sessions/{s['id']}/turns/text",
                headers=headers,
                json={"turn_id": 1, "text": "你好"},
            )
            assert result.status_code == 202
            events = [socket.receive_json() for _ in range(3)]
            reply = events[-1]
            assert reply["type"] == "reply.ready"
            assert reply["epoch"] == s["epoch"]
            assert client.get(reply["payload"]["audio_path"], headers=headers).status_code == 200
            assert client.get(reply["payload"]["audio_path"]).status_code == 404
            socket.send_json(
                {"type": "playback", "epoch": s["epoch"], "turn_id": 1, "status": "started"}
            )
            socket.send_json(
                {"type": "playback", "epoch": s["epoch"], "turn_id": 1, "status": "ended"}
            )
        assert client.delete(f"/api/sessions/{s['id']}", headers=headers).status_code == 200


def test_websocket_rejects_unknown_origin():
    import pytest
    from starlette.websockets import WebSocketDisconnect

    with TestClient(create_app(config(), FakeProviders())) as client:
        s = client.post("/api/sessions").json()
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(
                f"/ws/sessions/{s['id']}", headers={"origin": "https://untrusted.example"}
            ):
                pass


def test_blank_text_rejected_and_health_has_no_keys():
    with TestClient(create_app(config(llm_api_key="private-test-key"), FakeProviders())) as client:
        assert "private-test-key" not in client.get("/api/health").text
        s = client.post("/api/sessions").json()
        assert (
            client.post(
                f"/api/sessions/{s['id']}/turns/text",
                headers={"X-Session-Token": s["token"]},
                json={"turn_id": 1, "text": "  "},
            ).status_code
            == 422
        )
