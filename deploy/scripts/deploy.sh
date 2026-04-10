#!/usr/bin/env bash
set -euo pipefail

environment="${1:?environment name is required}"

case "${environment}" in
  production)
    env_file=".env.production"
    compose_args=()
    services=(postgres-prod api-prod)
    health_url="http://127.0.0.1:3000/health"
    ;;
  stage)
    env_file=".env.stage"
    compose_args=(--profile stage)
    services=(postgres-stage api-stage)
    health_url="http://127.0.0.1:3001/health"
    ;;
  *)
    echo "Unsupported environment: ${environment}" >&2
    exit 1
    ;;
esac

if [[ ! -f "${env_file}" ]]; then
  echo "Missing ${env_file}" >&2
  exit 1
fi

docker compose "${compose_args[@]}" pull postgres-prod postgres-stage nginx >/dev/null 2>&1 || true
docker compose "${compose_args[@]}" up -d --build "${services[@]}"

for attempt in $(seq 1 20); do
  if curl -fsS "${health_url}" >/dev/null; then
    echo "${environment} deployment is healthy."
    exit 0
  fi
  sleep 5
done

echo "${environment} health check failed: ${health_url}" >&2
docker compose "${compose_args[@]}" ps >&2
exit 1
