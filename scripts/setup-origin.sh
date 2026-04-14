#!/usr/bin/env bash
set -euo pipefail

# Configure git remote origin in environments where it is missing.
# Usage:
#   ./scripts/setup-origin.sh <remote-url>
# or
#   GIT_REMOTE_URL=<remote-url> ./scripts/setup-origin.sh

remote_url="${1:-${GIT_REMOTE_URL:-}}"

if [[ -z "$remote_url" ]]; then
  echo "Usage: ./scripts/setup-origin.sh <remote-url>"
  echo "Or set GIT_REMOTE_URL environment variable."
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$remote_url"
  echo "Updated origin -> $remote_url"
else
  git remote add origin "$remote_url"
  echo "Added origin -> $remote_url"
fi

git remote -v
