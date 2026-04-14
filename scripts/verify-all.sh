#!/usr/bin/env bash
set -euo pipefail

: "${AUTH_SECRET:=devsecret}"
: "${ALLOW_IN_MEMORY_STORE:=true}"

export AUTH_SECRET
export ALLOW_IN_MEMORY_STORE

branch_count="$(git for-each-ref --format='%(refname:short)' refs/heads | wc -l | tr -d ' ')"
if [[ "$branch_count" -gt 3 ]]; then
  echo "Branch policy violation: more than 3 local branches ($branch_count)."
  exit 9
fi

node --check api/index.js
node --check src/server.js
node --check lib/items.js
node --check lib/sync.js
node --check lib/systemRoutes.js
node --check scripts/audit.js
node --check scripts/e2e.js
node --check scripts/backup.js
node --check scripts/restore.js
bash -n scripts/merge-all-branches.sh

npm run audit
npm run test:e2e
npm run db:ping
