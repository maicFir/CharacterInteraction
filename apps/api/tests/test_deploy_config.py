import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]


def run_config(tmp_path, **values):
    (tmp_path / "infra").mkdir(exist_ok=True)
    # Copy only the non-secret proxy template used to generate a reviewable config.
    (tmp_path / "infra/nginx.example.conf").write_text(
        (ROOT / "infra/nginx.example.conf").read_text()
    )
    env = {
        "PATH": os.environ["PATH"],
        "OPENROUTER_API_KEY": "test-only",
        "ALLOWED_ORIGINS": "https://scene.vercel.app",
        **values,
    }
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts/write_deploy_config.py")],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
    )
    return result


def test_deployment_uses_dedicated_loopback_port_and_no_managed_edge_by_default(tmp_path):
    result = run_config(tmp_path)
    assert result.returncode == 0, result.stderr
    config = (tmp_path / "infra/domain.env").read_text()
    assert "API_HOST_PORT=18473\n" in config
    assert "MANAGED_HTTPS=false\n" in config
    assert "127.0.0.1:18473" in (tmp_path / "infra/nginx.generated.conf").read_text()
    assert "test-only" not in result.stdout + result.stderr + config


def test_custom_backend_port_updates_generated_reverse_proxy(tmp_path):
    result = run_config(tmp_path, API_HOST_PORT="28473", API_DOMAIN="api.scene.example.com")
    assert result.returncode == 0, result.stderr
    assert "API_HOST_PORT=28473" in (tmp_path / "infra/domain.env").read_text()
    proxy = (tmp_path / "infra/nginx.generated.conf").read_text()
    assert "127.0.0.1:28473" in proxy
    assert "api.scene.example.com" in proxy


@pytest.mark.parametrize("value", ["80", "0", "65536", "18473;echo unsafe", "abc"])
def test_invalid_server_ports_fail_before_writing_configuration(tmp_path, value):
    result = run_config(tmp_path, API_HOST_PORT=value)
    assert result.returncode != 0
    assert not (tmp_path / "infra/runtime.json").exists()


def test_port_preflight_distinguishes_host_mapping_from_container_port():
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "check_ports", ROOT / "scripts/check_deploy_ports.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    bindings = {"8000/tcp": [{"HostIp": "127.0.0.1", "HostPort": "18473"}]}
    assert module.owns_port(bindings, 18473)
    assert not module.owns_port(bindings, 8000)


def test_occupied_port_is_rejected_without_stopping_the_existing_listener():
    import importlib.util
    import socket

    spec = importlib.util.spec_from_file_location(
        "check_ports", ROOT / "scripts/check_deploy_ports.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as existing:
        existing.bind(("127.0.0.1", 0))
        existing.listen(1)
        port = existing.getsockname()[1]
        with pytest.raises(SystemExit, match="existing services were not stopped"):
            module.check_port(port)
        assert existing.getsockname()[1] == port


def test_production_archive_keeps_backend_models_and_excludes_local_environment(tmp_path):
    import shlex
    import shutil
    import tarfile

    assert run_config(tmp_path).returncode == 0
    command = next(
        line.strip()
        for line in (ROOT / ".github/workflows/deploy.yml").read_text().splitlines()
        if line.strip().startswith("tar --exclude=")
    )
    arguments = shlex.split(command)
    archive_position = arguments.index("-czf") + 1
    for relative in arguments[archive_position + 1 :]:
        source, target = ROOT / relative, tmp_path / relative
        if target.exists():
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)
    (tmp_path / "apps/api/app/.env.development").write_text("MUST_NOT_SHIP=test")
    subprocess.run(arguments, cwd=tmp_path, check=True, capture_output=True)
    with tarfile.open(tmp_path / "deploy.tgz") as archive:
        names = archive.getnames()
    assert "apps/api/app/models/session.py" in names
    assert "apps/api/app/models/scene_definition.py" in names
    assert "scripts/check_deploy_ports.py" in names
    assert not any("apps/web" in name or ".env.development" in name for name in names)


def test_ci_release_pins_image_to_the_commit(tmp_path):
    sha = "a" * 40
    result = run_config(tmp_path, GITHUB_SHA=sha)
    assert result.returncode == 0, result.stderr
    assert f"API_IMAGE=after-rain-api:{sha}" in (tmp_path / "infra/domain.env").read_text()
