#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "VERCEL_TOKEN is required" >&2
  exit 1
fi

SCOPE="${VERCEL_SCOPE:-criscode2022s-projects}"
ORG_ID="${VERCEL_ORG_ID:-team_XDogXucjsiIPPOiJSxbMGbSc}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_URL="https://hirestack-api.vercel.app"
WEB_URL="https://hirestack-web.vercel.app"
SHA="$(git -C "$ROOT" rev-parse HEAD)"

failed=0

wait_http() {
  local url="$1"
  local want="$2"
  local i code
  for i in $(seq 1 36); do
    code="$(curl -sS -m 20 -o /tmp/hirestack-wait.body -w '%{http_code}' "$url" || true)"
    if [[ "$code" == "$want" ]]; then
      echo "Ready ${url} → ${code}"
      return 0
    fi
    echo "Waiting on ${url} (got ${code:-down})"
    sleep 5
  done
  echo "Timed out waiting for ${url} → ${want}" >&2
  return 1
}

deploy_project() {
  local project_id="$1"
  local name="$2"
  mkdir -p .vercel
  cat > .vercel/project.json <<EOF
{"orgId":"${ORG_ID}","projectId":"${project_id}"}
EOF
  echo "Deploying ${name} (${project_id}) sha=${SHA}"
  if ! npx vercel --prod --yes --scope "$SCOPE" --token "$VERCEL_TOKEN" --meta gitCommitSha="$SHA"; then
    echo "Deploy failed for ${name}" >&2
    failed=1
    return 1
  fi
}

# Root directory + install/build come from each Vercel project's rootDirectory
# (apps/api or apps/web) together with that app's vercel.json.
# Production hosts rewrite /api to hirestack-api; Git preview hosts keep the Nest preview rewrite.
deploy_project prj_xDMCF55ThMXgZyVqeKVmuht4br7n hirestack-api || true
deploy_project prj_LFR3dUvgRgeizxLJcKhbmW8aVvMT hirestack-nestjs-api || true

if ! wait_http "${API_URL}/api/billing/plans" 200; then
  echo "hirestack-api did not expose billing after promote" >&2
  failed=1
else
  echo "hirestack-api billing catalog is live"
fi

deploy_project prj_vg09GADHx67h4aBvEsAgc5FpoUlZ hirestack-web || true
deploy_project prj_nZQVQ1fGsMHvabN1DC6N0mkOukrO hirestack-angular-web || true

if wait_http "${WEB_URL}" 200; then
  if grep -qi 'hiring software that sells the workflow' /tmp/hirestack-wait.body; then
    echo "hirestack-web is serving the SaaS title"
  else
    echo "hirestack-web is up but still not the SaaS title" >&2
    grep -o '<title>[^<]*</title>' /tmp/hirestack-wait.body || true
    failed=1
  fi
else
  failed=1
fi

if [[ "$failed" -ne 0 ]]; then
  echo "Production promote did not verify" >&2
fi

exit "$failed"
