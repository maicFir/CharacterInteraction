import json

from app.core import config


def test_development_file_overrides_base_env_independently_of_working_directory(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(config, "API_ROOT", tmp_path, raising=False)
    monkeypatch.delenv("APP_CONFIG_FILE", raising=False)
    monkeypatch.delenv("OPENROUTER_MODEL", raising=False)
    monkeypatch.setenv("APP_ENV", "development")
    (tmp_path / ".env").write_text("OPENROUTER_MODEL=base/model\n")
    (tmp_path / ".env.development").write_text("OPENROUTER_MODEL=development/model\n")
    assert config.load_settings().openrouter_model == "development/model"


def test_process_environment_overrides_local_dotenv(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "API_ROOT", tmp_path, raising=False)
    monkeypatch.delenv("APP_CONFIG_FILE", raising=False)
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("OPENROUTER_MODEL", "process/model")
    (tmp_path / ".env.development").write_text("OPENROUTER_MODEL=file/model\n")
    assert config.load_settings().openrouter_model == "process/model"


def test_production_json_does_not_load_local_development_secrets(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "API_ROOT", tmp_path, raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    secret = tmp_path / "runtime.json"
    secret.write_text(json.dumps({"OPENROUTER_MODEL": "production/model"}))
    monkeypatch.setenv("APP_CONFIG_FILE", str(secret))
    (tmp_path / ".env.development").write_text("OPENROUTER_API_KEY=development-only-key\n")
    settings = config.load_settings()
    assert settings.openrouter_model == "production/model"
    assert settings.openrouter_api_key == ""


def test_local_model_path_is_relative_to_api_project(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "API_ROOT", tmp_path)
    monkeypatch.delenv("APP_CONFIG_FILE", raising=False)
    monkeypatch.delenv("PIPER_MODEL", raising=False)
    monkeypatch.setenv("APP_ENV", "development")
    (tmp_path / ".env.development").write_text("PIPER_MODEL=weights/voice.onnx\n")
    assert config.load_settings().piper_model == str(tmp_path / "weights/voice.onnx")


def test_local_whisper_cache_is_relative_to_api_project(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "API_ROOT", tmp_path)
    monkeypatch.delenv("APP_CONFIG_FILE", raising=False)
    monkeypatch.delenv("WHISPER_DOWNLOAD_ROOT", raising=False)
    monkeypatch.setenv("APP_ENV", "development")
    (tmp_path / ".env.development").write_text("WHISPER_DOWNLOAD_ROOT=weights/whisper\n")
    assert getattr(config.load_settings(), "whisper_download_root", None) == str(
        tmp_path / "weights/whisper"
    )
