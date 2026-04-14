#!/usr/bin/env bash
set -euo pipefail

# Merges all local branches into the target branch (default: main).
# Usage:
#   ./scripts/merge-all-branches.sh [target]

TARGET_BRANCH="${1:-main}"

if ! git rev-parse --verify "$TARGET_BRANCH" >/dev/null 2>&1; then
  echo "Target branch '$TARGET_BRANCH' does not exist locally."
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$current_branch" == "HEAD" ]]; then
  echo "Detached HEAD is not supported. Checkout a branch first."
  exit 1
fi

cleanup() {
  git checkout "$current_branch" >/dev/null 2>&1 || true
}
trap cleanup EXIT

git checkout "$TARGET_BRANCH" >/dev/null

while IFS= read -r branch; do
  if [[ "$branch" == "$TARGET_BRANCH" ]]; then
    continue
  fi

  echo "Merging branch: $branch -> $TARGET_BRANCH"
  if ! git merge --no-ff "$branch" -m "Merge branch '$branch' into $TARGET_BRANCH"; then
    echo "Merge conflict encountered while merging '$branch'. Resolve conflicts, then re-run."
    exit 2
  fi
done < <(git for-each-ref --format='%(refname:short)' refs/heads)

echo "All local branches merged into '$TARGET_BRANCH'."
