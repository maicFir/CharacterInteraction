import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("storage", ROOT / "scripts/check_deploy_storage.py")
storage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(storage)


def test_full_filesystem_blocks_transfer_before_loading_image(monkeypatch):
    monkeypatch.setattr(storage.shutil, "disk_usage", lambda _: SimpleNamespace(free=122 * 1024**2))
    with pytest.raises(SystemExit, match="空间不足"):
        storage.check_storage(["/docker"], minimum_mb=3072)


def test_storage_budget_accounts_for_compressed_content_and_unpacked_image(monkeypatch):
    monkeypatch.setattr(storage.shutil, "disk_usage", lambda _: SimpleNamespace(free=4 * 1024**3))
    with pytest.raises(SystemExit, match="空间不足"):
        storage.check_storage(["/docker"], minimum_mb=3072, image_bytes=2 * 1024**3)


def test_sufficient_space_passes_without_deleting_anything(monkeypatch):
    monkeypatch.setattr(storage.shutil, "disk_usage", lambda _: SimpleNamespace(free=10 * 1024**3))
    storage.check_storage(["/docker", "/containerd"], minimum_mb=3072, image_bytes=1024**3)
