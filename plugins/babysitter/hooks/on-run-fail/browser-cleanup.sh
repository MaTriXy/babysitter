#!/bin/bash
# Cleanup browser runtime/container state after failed run completion.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/browser-runtime.sh
source "$SCRIPT_DIR/../lib/browser-runtime.sh"

PAYLOAD="$(cat)"
RUN_ID="$(echo "$PAYLOAD" | jq -r '.runId // empty')"

if [[ -z "$RUN_ID" ]]; then
  echo "[on-run-fail/browser-cleanup] Missing runId; skipping" >&2
  exit 0
fi

if [[ "$(brt_bool "${BABYSITTER_BROWSER_PRESERVE_RUNTIME:-false}")" == "true" ]]; then
  echo "[on-run-fail/browser-cleanup] Preserving browser runtime state for run $RUN_ID" >&2
  exit 0
fi

RUN_DIR=".a5c/runs/$RUN_ID"
STATE_FILE="$(brt_state_file_for_run "$RUN_DIR")"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "[on-run-fail/browser-cleanup] No browser runtime state for run $RUN_ID" >&2
  exit 0
fi

CONTAINER_ID="$(jq -r '.container.id // empty' "$STATE_FILE")"
if [[ -n "$CONTAINER_ID" ]] && command -v container >/dev/null 2>&1; then
  container stop "$CONTAINER_ID" >/dev/null 2>&1 || true
  container delete "$CONTAINER_ID" >/dev/null 2>&1 || true
fi

rm -f "$STATE_FILE"
rmdir "$(dirname "$STATE_FILE")" >/dev/null 2>&1 || true

echo "[on-run-fail/browser-cleanup] Removed browser runtime state for run $RUN_ID" >&2
exit 0
