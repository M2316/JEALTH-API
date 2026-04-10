#!/usr/bin/env bash
set -euo pipefail

target_env="${1:?target environment file path is required}"
secret_value="${2:-}"

if [[ -z "${secret_value}" ]]; then
  echo "No inline env content supplied for ${target_env}; keeping existing file if present."
  exit 0
fi

umask 177
printf '%s\n' "${secret_value}" > "${target_env}"
