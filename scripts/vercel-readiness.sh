#!/usr/bin/env bash
set -euo pipefail

required_files=("vercel.json" "api/index.js" "index.html" "package.json")

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file"
    exit 2
  fi
done

python -m json.tool vercel.json >/dev/null

current_branch="$(git rev-parse --abbrev-ref HEAD)"
current_commit="$(git rev-parse --short HEAD)"

echo "Current branch: $current_branch"
echo "Current commit: $current_commit"

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "ERROR: no git remote 'origin' configured. Vercel Git integration cannot receive updates until remote is set."
  exit 3
fi

echo "Remote origin: $(git remote get-url origin)"

git fetch origin --prune >/dev/null 2>&1 || true
if git rev-parse --verify "origin/$current_branch" >/dev/null 2>&1; then
  ahead_count="$(git rev-list --count "origin/$current_branch..$current_branch")"
  behind_count="$(git rev-list --count "$current_branch..origin/$current_branch")"
  echo "Ahead of origin/$current_branch: $ahead_count"
  echo "Behind origin/$current_branch: $behind_count"
else
  echo "WARNING: remote branch origin/$current_branch does not exist yet."
fi

echo "Vercel readiness checks passed."
