"""Read-only Docker/containerd disk preflight, run before receiving a release image."""

import argparse
import shutil
import subprocess
from pathlib import Path

MIB = 1024**2


def check_storage(paths, minimum_mb=3072, image_bytes=0):
    # Reserve room for content storage, unpacked snapshots and model/startup work.
    required = max(minimum_mb * MIB, image_bytes * 2 + 512 * MIB)
    for path in dict.fromkeys(str(path) for path in paths):
        free = shutil.disk_usage(path).free
        print(f"Disk {path}: available {free // MIB} MiB; required {required // MIB} MiB.")
        if free < required:
            raise SystemExit(
                "部署空间不足，已在镜像传输前停止。请扩容或确认可清理的文件后重试；"
                "不会自动删除其他项目、镜像、缓存或数据卷。"
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-free-mb", type=int, default=3072)
    parser.add_argument("--image-bytes", type=int, default=0)
    args = parser.parse_args()
    if args.min_free_mb < 1 or args.image_bytes < 0:
        parser.error("storage limits must be positive")
    result = subprocess.run(
        ["docker", "info", "--format", "{{.DockerRootDir}}"], capture_output=True, text=True
    )
    if result.returncode != 0 or not result.stdout.strip():
        raise SystemExit("无法读取 Docker 存储目录，请检查 Docker 服务和部署用户权限。")
    paths = [Path(result.stdout.strip()), Path.home()]
    containerd = Path("/var/lib/containerd")
    if containerd.exists():
        paths.append(containerd)
    try:
        check_storage(paths, args.min_free_mb, args.image_bytes)
    except OSError:
        raise SystemExit("无法读取存储目录的可用空间，请在服务器核对目录和访问权限。") from None
