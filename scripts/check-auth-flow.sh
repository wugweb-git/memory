#!/usr/bin/env bash
set -euo pipefail

# Validate deployed auth endpoints quickly.
# Usage:
#   ./scripts/check-auth-flow.sh <base-url>

base_url="${1:-}"
if [[ -z "$base_url" ]]; then
  echo "Usage: ./scripts/check-auth-flow.sh <base-url>"
  exit 1
fi
base_url="${base_url%/}"

email="diag_$(date +%s)@example.com"
password='DiagPass123!'

signup_payload="{\"email\":\"$email\",\"password\":\"$password\"}"

signup_code="$(curl -sS -o /tmp/auth_signup.json -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$base_url/api/auth/signup" -d "$signup_payload" || true)"
echo "signup -> HTTP $signup_code"
if [[ "$signup_code" == "000" ]]; then
  echo "Network/proxy blocked request."
  exit 2
fi

login_payload="{\"email\":\"$email\",\"password\":\"$password\"}"
login_code="$(curl -sS -o /tmp/auth_login.json -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$base_url/api/auth/login" -d "$login_payload" || true)"
echo "login -> HTTP $login_code"

if [[ "$login_code" != "200" ]]; then
  echo "Login failed payload:"
  cat /tmp/auth_login.json
  exit 3
fi

token="$(python - <<'PY'
import json
with open('/tmp/auth_login.json','r',encoding='utf-8') as f:
    data=json.load(f)
print(data.get('access_token',''))
PY
)"

me_code="$(curl -sS -o /tmp/auth_me.json -w '%{http_code}' -H "Authorization: Bearer $token" "$base_url/api/auth/me" || true)"
echo "me -> HTTP $me_code"
if [[ "$me_code" != "200" ]]; then
  echo "me failed payload:"
  cat /tmp/auth_me.json
  exit 4
fi

echo "Auth flow check passed."
