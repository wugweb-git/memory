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
PATTERN='(sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|mongodb(\+srv)?:\/\/[^[:space:]]+@[^[:space:]]+|vercel_blob_rw_[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY)'

if rg -n "$PATTERN" . "${EXCLUDES[@]}" >/tmp/secret_scan_hits.txt; then
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
