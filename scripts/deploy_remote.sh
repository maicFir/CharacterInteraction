#!/usr/bin/env bash
set -euo pipefail
release_sha="${1:?commit required}"
run_id="${2:?run id required}"
[[ "$release_sha" =~ ^[a-f0-9]{40}$ && "$run_id" =~ ^[0-9]+$ ]] || exit 1
base="$HOME/character-interaction"
release="$base/releases/$release_sha-$run_id"
archive="/tmp/after-rain-$release_sha.tgz"
umask 077
mkdir -p "$release"
chmod 700 "$base" "$base/releases" "$release"
tar -xzf "$archive" -C "$release"
rm -f "$archive"
# Parent directories are private; the unprivileged container needs read access to this bind-mounted file.
chmod 644 "$release/infra/runtime.json"
previous="$(readlink "$base/current" || true)"
cd "$release"
compose=(docker compose --env-file infra/domain.env -f infra/compose.server.yml)
if [[ "$(sed -n 's/^MANAGED_HTTPS=//p' infra/domain.env)" == true ]]; then
  compose+=(--profile edge)
fi
# Check only this project's listeners. Do not stop or recreate other projects.
api_port="$(sed -n 's/^API_HOST_PORT=//p' infra/domain.env)"
api_port="${api_port:-18473}"
[[ "$api_port" =~ ^[0-9]+$ ]] && ((10#$api_port >= 1024 && 10#$api_port <= 65535)) || exit 1
owned_api="$("${compose[@]}" ps -q api)"
python3 scripts/check_deploy_ports.py --port "$api_port" --container "$owned_api"
if [[ "$(sed -n 's/^MANAGED_HTTPS=//p' infra/domain.env)" == true ]]; then
  owned_edge="$("${compose[@]}" ps -q caddy)"
  python3 scripts/check_deploy_ports.py --port 80 --container "$owned_edge"
  python3 scripts/check_deploy_ports.py --port 443 --container "$owned_edge"
fi

rollback() {
  echo 'Deployment failed. Attempting previous-release rollback.'
  if [[ -n "$previous" && -d "$previous" ]]; then
    cd "$previous"
    docker compose --env-file infra/domain.env -f infra/compose.server.yml up -d --build api
  fi
}
trap rollback ERR
"${compose[@]}" build api
"${compose[@]}" up -d --wait --wait-timeout 120
# Only local speech providers require model weights. Cached downloads are reused in the volume.
"${compose[@]}" exec -T api .venv/bin/python prepare_models.py
curl --fail --retry 5 --retry-delay 3 "http://127.0.0.1:$api_port/api/health"
ln -sfn "$release" "$base/current"
trap - ERR
echo 'Backend release healthy. Previous releases retained for rollback.'
