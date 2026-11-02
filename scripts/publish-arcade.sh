#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "$(git branch --show-current)" != main ]]; then
  echo 'Publish from main after the source PR is merged.' >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Commit or discard local changes before publishing.' >&2
  exit 1
fi
if [[ ! -f dist/index.html || ! -f dist/.nojekyll ]]; then
  echo 'Missing game build or .nojekyll in dist.' >&2
  exit 1
fi

git fetch origin main bekharsky/arcade
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo 'Local main must match origin/main before publishing.' >&2
  exit 1
fi
git rev-parse HEAD > dist/source-revision.txt

publish_dir="$(mktemp -d)"
rmdir "$publish_dir"
cleanup() {
  git worktree remove --force "$publish_dir" 2>/dev/null || true
  rm -rf "$publish_dir"
}
trap cleanup EXIT

git worktree add --detach "$publish_dir" origin/bekharsky/arcade
git -C "$publish_dir" rm -r -q -- .
cp -R dist/. "$publish_dir/"
git -C "$publish_dir" add -A
if git -C "$publish_dir" diff --cached --quiet; then
  echo 'Arcade build is already current.'
  exit 0
fi
git -C "$publish_dir" commit -m "Publish arcade build from $(git rev-parse --short HEAD)"
git -C "$publish_dir" push origin HEAD:refs/heads/bekharsky/arcade
