#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "VERCEL_TOKEN is required" >&2
  exit 1
fi

SCOPE="${VERCEL_SCOPE:-criscode2022s-projects}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

deploy_project() {
  local project_id="$1"
  local name="$2"
  mkdir -p .vercel
  cat > .vercel/project.json <<EOF
{"orgId":"team_XDogXucjsiIPPOiJSxbMGbSc","projectId":"${project_id}"}
EOF
  echo "Deploying ${name} (${project_id})"
  npx vercel --prod --yes --scope "$SCOPE" --token "$VERCEL_TOKEN"
}

# Root directory + install/build come from each Vercel project's rootDirectory
# (apps/api or apps/web) together with that app's vercel.json.
deploy_project prj_xDMCF55ThMXgZyVqeKVmuht4br7n hirestack-api
deploy_project prj_LFR3dUvgRgeizxLJcKhbmW8aVvMT hirestack-nestjs-api
deploy_project prj_vg09GADHx67h4aBvEsAgc5FpoUlZ hirestack-web
deploy_project prj_nZQVQ1fGsMHvabN1DC6N0mkOukrO hirestack-angular-web
