import importlib.util
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("ssh_setup", ROOT / "scripts/configure_deploy_ssh.py")
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


@pytest.fixture(scope="module")
def public_key(tmp_path_factory):
    key = tmp_path_factory.mktemp("host-key") / "host"
    subprocess.run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-f", str(key)], check=True)
    return key.with_suffix(".pub").read_text().strip()


@pytest.mark.parametrize(
    "port,identifier", [("22", "server.example.com"), ("2222", "[server.example.com]:2222")]
)
def test_server_public_key_is_pinned_to_exact_deployment_endpoint(
    tmp_path, public_key, port, identifier
):
    folder = tmp_path / "ssh"
    setup.configure(folder, "server.example.com", port, "test-private-key", public_key)
    result = subprocess.run(
        ["ssh-keygen", "-F", identifier, "-f", str(folder / "known_hosts")],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert public_key.split()[1] in result.stdout
    assert (folder / "id_ed25519").stat().st_mode & 0o777 == 0o600


def test_known_hosts_for_another_host_is_not_silently_relabelled(tmp_path, public_key):
    with pytest.raises(ValueError, match="SSH_HOST.*SSH_PORT"):
        setup.configure(
            tmp_path / "ssh",
            "actual.example.com",
            "22",
            "test-private-key",
            f"other.example.com {public_key}",
        )
    assert not (tmp_path / "ssh/id_ed25519").exists()


def test_malformed_key_is_rejected_before_scp(tmp_path):
    with pytest.raises(ValueError, match="公钥"):
        setup.configure(
            tmp_path / "ssh",
            "server.example.com",
            "22",
            "test-private-key",
            "ssh-ed25519 invalid-base64",
        )


def test_literal_newlines_and_crlf_do_not_break_valid_pins(tmp_path, public_key):
    setup.configure(
        tmp_path / "ssh",
        "server.example.com",
        "22",
        "test-private-key",
        f"# pinned key\\nserver.example.com {public_key}\\n",
    )
    assert "\\n" not in (tmp_path / "ssh/known_hosts").read_text()


def test_private_key_in_known_hosts_is_rejected_without_echoing_it(tmp_path):
    value = "-----BEGIN OPENSSH PRIVATE KEY-----\nprivate-test-material"
    with pytest.raises(ValueError) as error:
        setup.configure(tmp_path / "ssh", "server.example.com", "22", "test-private-key", value)
    assert "private-test-material" not in str(error.value)


def test_existing_hashed_known_hosts_record_is_supported(tmp_path, public_key):
    source = tmp_path / "hashed"
    source.write_text(f"[server.example.com]:2222 {public_key}\n")
    subprocess.run(["ssh-keygen", "-H", "-f", str(source)], capture_output=True, check=True)
    setup.configure(
        tmp_path / "ssh", "server.example.com", "2222", "test-private-key", source.read_text()
    )
    assert "|1|" in (tmp_path / "ssh/known_hosts").read_text()
