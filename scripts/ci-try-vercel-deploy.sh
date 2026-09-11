#!/usr/bin/env bash
set -euo pipefail

present() {
  local name="$1"
  local value="${2:-}"
  if [ -n "$value" ]; then
    echo "credential present: ${name}"
  else
    echo "credential missing: ${name}"
  fi
}

present VERCEL_TOKEN "${VERCEL_TOKEN:-}"
present VERCEL_ACCESS_TOKEN "${VERCEL_ACCESS_TOKEN:-}"
present VERCEL_ORG_ID "${VERCEL_ORG_ID:-}"
present VERCEL_PROJECT_ID "${VERCEL_PROJECT_ID:-}"

export VERCEL_TOKEN="${VERCEL_TOKEN:-${VERCEL_ACCESS_TOKEN:-}}"

if [ -z "${VERCEL_TOKEN}" ]; then
  echo "No Vercel token on this job. Skipping production promote."
  exit 0
fi

bash "$(cd "$(dirname "$0")" && pwd)/deploy-vercel.sh"
