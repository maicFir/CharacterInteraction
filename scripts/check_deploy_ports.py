"""Fail before deployment if a host listener belongs to another service; never stop it."""

import argparse
import json
import socket
import subprocess


def owns_port(bindings, port):
    return any(
        int(binding.get("HostPort", 0)) == port
        for entries in (bindings or {}).values()
        for binding in (entries or [])
    )


def check_port(port, container=""):
    if container:
        result = subprocess.run(
            ["docker", "inspect", "--format", "{{json .NetworkSettings.Ports}}", container],
            check=True,
            capture_output=True,
            text=True,
        )
        if owns_port(json.loads(result.stdout), port):
            print(f"Port {port}: already owned by this Compose service.")
            return
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.bind(("0.0.0.0", port))
    except OSError as error:
        raise SystemExit(
            f"Host port {port} is unavailable. Choose another API_HOST_PORT; existing services were not stopped."
        ) from error
    print(f"Port {port}: available.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--container", default="")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    check_port(args.port, args.container)
