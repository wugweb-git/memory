#!/usr/bin/env bash
set -euo pipefail

echo "Running secret pattern scan..."

# Do not scan dependency/build folders.
EXCLUDES=(
  "--glob=!node_modules/**"
  "--glob=!.next/**"
  "--glob=!dist/**"
  "--glob=!build/**"
)

# Basic high-signal patterns for commonly leaked secrets.
PATTERN='(sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|postgres(ql)?:\/\/[^[:space:]\/:]+:[^[:space:]@]{6,}@[^[:space:]]+|npg_[A-Za-z0-9]{10,}|mongodb(\+srv)?:\/\/[^[:space:]]+@[^[:space:]]+|vercel_blob_rw_[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY)'

# Prefer ripgrep; fall back to git grep (tracked files) so the scan never silently passes.
if command -v rg >/dev/null 2>&1; then
  scan() { rg -n "$PATTERN" . "${EXCLUDES[@]}" >/tmp/secret_scan_hits.txt; }
elif command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  scan() { git grep -nIE "$PATTERN" -- . ':!package-lock.json' ':!node_modules' >/tmp/secret_scan_hits.txt; }
else
  echo "❌ Neither rg nor git is available; cannot scan." >&2
  exit 2
fi

if scan; then
  echo "❌ Potential secrets found:"
  cat /tmp/secret_scan_hits.txt
  echo ""
  echo "Action required:"
  echo "1) Revoke/rotate exposed keys."
  echo "2) Remove secrets from code and commit history."
  echo "3) Move secrets to Vercel/Netlify environment variables."
  exit 1
fi

echo "✅ No high-signal secret patterns found."
