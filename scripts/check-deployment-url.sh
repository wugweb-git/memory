#!/usr/bin/env bash
set -euo pipefail

# Check whether a deployed URL is publicly reachable and API routes respond.
# Usage:
#   ./scripts/check-deployment-url.sh <deployment-url>

base_url="${1:-}"
if [[ -z "$base_url" ]]; then
  echo "Usage: ./scripts/check-deployment-url.sh <deployment-url>"
  exit 1
fi

base_url="${base_url%/}"

check_url() {
  local url="$1"
  local code
  code="$(curl -sS -o /tmp/deploy_check_body.txt -w '%{http_code}' "$url" || true)"
  echo "$url -> HTTP $code"
  if [[ "$code" == "000" ]]; then
    echo "  Network/proxy blocked the request from this environment."
  elif [[ "$code" == "401" || "$code" == "403" ]]; then
    echo "  Access is blocked (Deployment Protection / Auth / Firewall)."
  elif [[ "$code" == "404" ]]; then
    echo "  Route not found. Check vercel.json routes and function paths."
  elif [[ "$code" =~ ^2 ]]; then
    echo "  OK"
  else
    echo "  Unexpected status. Inspect response body if needed."
  fi
}

check_url "$base_url/"
check_url "$base_url/api"
check_url "$base_url/api/test"
