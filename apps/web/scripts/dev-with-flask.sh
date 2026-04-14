#!/usr/bin/env bash
# Runs Next.js and the Flask API together (no extra npm deps).
# Invoked from repo root via: pnpm --filter web dev:with-flask
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

cleanup() {
  for pid in $(jobs -p); do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup INT TERM EXIT

pnpm --filter web dev &
pnpm --filter web dev:flask &
wait
