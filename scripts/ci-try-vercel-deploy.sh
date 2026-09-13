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
export VERCEL_ORG_ID="${VERCEL_ORG_ID:-team_XDogXucjsiIPPOiJSxbMGbSc}"
export VERCEL_SCOPE="${VERCEL_SCOPE:-criscode2022s-projects}"

mint_github_oidc() {
  local audience="$1"
  if [ -z "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" ] || [ -z "${ACTIONS_ID_TOKEN_REQUEST_TOKEN:-}" ]; then
    return 1
  fi
  local url="$ACTIONS_ID_TOKEN_REQUEST_URL"
  if [ -n "$audience" ]; then
    url="${url}&audience=${audience}"
  fi
  python3 - "$url" "$ACTIONS_ID_TOKEN_REQUEST_TOKEN" <<'PY'
import json, sys, urllib.request
url, token = sys.argv[1], sys.argv[2]
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
try:
    with urllib.request.urlopen(req, timeout=20) as res:
        body = json.loads(res.read().decode())
except Exception as exc:
    print(f"github oidc mint failed: {type(exc).__name__}", file=sys.stderr)
    sys.exit(1)
value = body.get("value") or ""
if not value:
    sys.exit(1)
print(value)
PY
}

exchange_vercel_token() {
  local subject="$1"
  local team="$2"
  python3 - "$subject" "$team" <<'PY'
import json, sys, urllib.parse, urllib.request
subject, team = sys.argv[1], sys.argv[2]
payload = urllib.parse.urlencode({
    "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
    "client_id": "cl_kyUx2zVvA4MGptBohkmtYHJly2XltXzD",
    "subject_token_type": "urn:ietf:params:oauth:token-type:id_token",
    "requested_token_type": "urn:ietf:params:oauth:token-type:access_token",
    "team_id_or_slug": team,
    "subject_token": subject,
}).encode()
req = urllib.request.Request("https://api.vercel.com/login/oauth/token", data=payload, method="POST")
try:
    with urllib.request.urlopen(req, timeout=20) as res:
        body = json.loads(res.read().decode())
except urllib.error.HTTPError as exc:
    detail = exc.read().decode("utf-8", "replace")[:300]
    print(f"oidc exchange {exc.code} for team {team}: {detail}", file=sys.stderr)
    sys.exit(1)
except Exception as exc:
    print(f"oidc exchange failed: {type(exc).__name__}", file=sys.stderr)
    sys.exit(1)
token = body.get("access_token") or ""
if not token:
    print("oidc exchange returned no access_token", file=sys.stderr)
    sys.exit(1)
print(token)
PY
}

if [ -z "${VERCEL_TOKEN}" ]; then
  echo "Trying GitHub OIDC → Vercel access token."
  minted=""
  for audience in "" "https://vercel.com" "https://vercel.com/criscode2022s-projects"; do
    if minted="$(mint_github_oidc "$audience")"; then
      echo "Minted a GitHub OIDC token${audience:+ for $audience}."
      break
    fi
    minted=""
  done
  if [ -n "$minted" ]; then
    exchanged=""
    for team in "team_XDogXucjsiIPPOiJSxbMGbSc" "criscode2022s-projects"; do
      if exchanged="$(exchange_vercel_token "$minted" "$team")"; then
        echo "OIDC exchange succeeded for ${team}."
        export VERCEL_TOKEN="$exchanged"
        break
      fi
      exchanged=""
    done
  else
    echo "Could not mint a GitHub OIDC token."
  fi
fi

if [ -z "${VERCEL_TOKEN}" ]; then
  echo "No Vercel token on this job. Production promote did not run."
  echo "Add a Vercel account token as the VERCEL_TOKEN GitHub Actions secret, then re-run deploy.yml. GitHub OIDC cannot authenticate the Vercel CLI."
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    cat >> "$GITHUB_STEP_SUMMARY" <<'EOF'
## Production was not promoted

`hirestack-web.vercel.app` and `hirestack-api.vercel.app` still need this SHA.

1. Create a token at [Vercel account tokens](https://vercel.com/account/settings/tokens)
2. Add it as the repository secret `VERCEL_TOKEN`
3. Optional for uploads: `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
4. Re-run the **Promote hirestack-api and hirestack-web** workflow

GitHub OIDC is minted on this job and Vercel rejects the exchange (`Not authorized`). A static `VERCEL_TOKEN` is required.
EOF
  fi
  if [ "${GITHUB_REF_NAME:-}" = "main" ]; then
    echo "::error::Production was not promoted. Add a Vercel account token as the VERCEL_TOKEN GitHub Actions secret, then re-run deploy.yml."
    exit 1
  fi
  echo "::warning::Skipped production promote on ${GITHUB_REF_NAME:-this branch} because VERCEL_TOKEN is not set."
  exit 0
fi

bash "$(cd "$(dirname "$0")" && pwd)/deploy-vercel.sh"
