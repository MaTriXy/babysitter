#!/bin/bash
# Execute a browser task effect using agent-browser with container/host runtime selection.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=browser-runtime.sh
source "$SCRIPT_DIR/browser-runtime.sh"

usage() {
  cat <<EOF >&2
Usage: $0 --run-id <runId> --effect-id <effectId> [--run-dir <runDir>]
EOF
}

if ! command -v jq >/dev/null 2>&1; then
  echo "[browser-executor] jq is required" >&2
  exit 2
fi

RUN_ID=""
EFFECT_ID=""
RUN_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id)
      RUN_ID="$2"
      shift 2
      ;;
    --effect-id)
      EFFECT_ID="$2"
      shift 2
      ;;
    --run-dir)
      RUN_DIR="$2"
      shift 2
      ;;
    *)
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$RUN_ID" ]] || [[ -z "$EFFECT_ID" ]]; then
  usage
  exit 2
fi

if [[ -z "$RUN_DIR" ]]; then
  RUN_DIR=".a5c/runs/$RUN_ID"
fi

TASK_JSON="$RUN_DIR/tasks/$EFFECT_ID/task.json"
ERROR_REF="tasks/$EFFECT_ID/browser-error.json"
ERROR_ABS="$RUN_DIR/$ERROR_REF"
METADATA_REF="tasks/$EFFECT_ID/browser-metadata.json"
METADATA_ABS="$RUN_DIR/$METADATA_REF"

mkdir -p "$(dirname "$ERROR_ABS")" "$(dirname "$METADATA_ABS")"

if [[ ! -f "$TASK_JSON" ]]; then
  jq -n \
    --arg effectId "$EFFECT_ID" \
    --arg taskJson "$TASK_JSON" \
    '{
      name: "Error",
      message: "Missing browser task definition",
      data: { effectId: $effectId, taskJson: $taskJson }
    }' > "$ERROR_ABS"
  echo "[browser-executor] Missing task definition: $TASK_JSON" >&2
  exit 10
fi

PROMPT="$(jq -r '.browser.prompt // empty' "$TASK_JSON")"
REQUESTED_RUNTIME="$(jq -r '.browser.runtime // env.BABYSITTER_BROWSER_RUNTIME // "auto"' "$TASK_JSON")"
SESSION_MODE_RAW="$(jq -r '.browser.sessionMode // "run"' "$TASK_JSON")"
CUSTOM_SESSION_ID="$(jq -r '.browser.sessionId // empty' "$TASK_JSON")"
PROVIDER="$(jq -r '.browser.provider // empty' "$TASK_JSON")"
MODEL="$(jq -r '.browser.model // empty' "$TASK_JSON")"
OUTPUT_MODE="$(jq -r '.browser.output // "json"' "$TASK_JSON")"

INPUT_REF="$(jq -r '.io.inputJsonPath // ("tasks/" + "'"$EFFECT_ID"'" + "/inputs.json")' "$TASK_JSON")"
OUTPUT_REF="$(jq -r '.io.outputJsonPath // ("tasks/" + "'"$EFFECT_ID"'" + "/output.json")' "$TASK_JSON")"
STDOUT_REF="$(jq -r '.io.stdoutPath // ("tasks/" + "'"$EFFECT_ID"'" + "/stdout.log")' "$TASK_JSON")"
STDERR_REF="$(jq -r '.io.stderrPath // ("tasks/" + "'"$EFFECT_ID"'" + "/stderr.log")' "$TASK_JSON")"

INPUT_ABS="$RUN_DIR/$INPUT_REF"
OUTPUT_ABS="$RUN_DIR/$OUTPUT_REF"
STDOUT_ABS="$RUN_DIR/$STDOUT_REF"
STDERR_ABS="$RUN_DIR/$STDERR_REF"

mkdir -p "$(dirname "$INPUT_ABS")" "$(dirname "$OUTPUT_ABS")" "$(dirname "$STDOUT_ABS")" "$(dirname "$STDERR_ABS")"

if [[ -z "$PROMPT" ]]; then
  jq -n \
    --arg effectId "$EFFECT_ID" \
    '{
      name: "Error",
      message: "Missing browser.prompt in task definition",
      data: { effectId: $effectId }
    }' > "$ERROR_ABS"
  echo "[browser-executor] Missing browser.prompt for effect $EFFECT_ID" >&2
  exit 11
fi

SELECTION_JSON="$(brt_select_backend "$REQUESTED_RUNTIME")"
SELECTION_ERROR="$(echo "$SELECTION_JSON" | jq -r '.error // empty')"
BACKEND="$(echo "$SELECTION_JSON" | jq -r '.backend // empty')"
SELECTION_REASON="$(echo "$SELECTION_JSON" | jq -r '.reason // empty')"
HOST_READY="$(echo "$SELECTION_JSON" | jq -r '.checks.hostReady // false')"
NORMALIZED_RUNTIME="$(echo "$SELECTION_JSON" | jq -r '.requestedRuntime // "auto"')"
SESSION_MODE="$(brt_normalize_session_mode "$SESSION_MODE_RAW")"

STARTED_AT="$(brt_now_iso)"
FALLBACK_USED="false"
FALLBACK_REASON=""
CONTAINER_ID=""

write_metadata() {
  local status="$1"
  local exit_code="$2"
  local effective_backend="$3"
  local session_id="$4"
  local finished_at
  finished_at="$(brt_now_iso)"
  jq -n \
    --arg runId "$RUN_ID" \
    --arg effectId "$EFFECT_ID" \
    --arg status "$status" \
    --arg requestedRuntime "$NORMALIZED_RUNTIME" \
    --arg selectedBackend "$BACKEND" \
    --arg effectiveBackend "$effective_backend" \
    --arg selectionReason "$SELECTION_REASON" \
    --arg sessionMode "$SESSION_MODE" \
    --arg sessionId "$session_id" \
    --arg containerId "$CONTAINER_ID" \
    --arg inputRef "$INPUT_REF" \
    --arg outputRef "$OUTPUT_REF" \
    --arg stdoutRef "$STDOUT_REF" \
    --arg stderrRef "$STDERR_REF" \
    --arg startedAt "$STARTED_AT" \
    --arg finishedAt "$finished_at" \
    --argjson exitCode "$exit_code" \
    --argjson fallbackUsed "$FALLBACK_USED" \
    --arg fallbackReason "$FALLBACK_REASON" \
    --argjson selection "$SELECTION_JSON" \
    '{
      runId: $runId,
      effectId: $effectId,
      status: $status,
      requestedRuntime: $requestedRuntime,
      selectedBackend: (if ($selectedBackend | length) > 0 then $selectedBackend else null end),
      effectiveBackend: (if ($effectiveBackend | length) > 0 then $effectiveBackend else null end),
      selectionReason: $selectionReason,
      sessionMode: $sessionMode,
      sessionId: $sessionId,
      containerId: (if ($containerId | length) > 0 then $containerId else null end),
      io: {
        inputRef: $inputRef,
        outputRef: $outputRef,
        stdoutRef: $stdoutRef,
        stderrRef: $stderrRef
      },
      fallback: {
        used: $fallbackUsed,
        reason: (if ($fallbackReason | length) > 0 then $fallbackReason else null end)
      },
      selection: $selection,
      startedAt: $startedAt,
      finishedAt: $finishedAt,
      exitCode: $exitCode
    }' > "$METADATA_ABS"
}

write_error() {
  local message="$1"
  local code="$2"
  local backend="$3"
  local session_id="$4"
  jq -n \
    --arg message "$message" \
    --arg effectId "$EFFECT_ID" \
    --arg backend "$backend" \
    --arg sessionId "$session_id" \
    --arg requestedRuntime "$NORMALIZED_RUNTIME" \
    --arg hint "Install/verify agent-browser for host mode, and configure Apple Container runtime for container mode." \
    --argjson code "$code" \
    '{
      name: "Error",
      message: $message,
      data: {
        effectId: $effectId,
        backend: (if ($backend | length) > 0 then $backend else null end),
        sessionId: (if ($sessionId | length) > 0 then $sessionId else null end),
        requestedRuntime: $requestedRuntime,
        exitCode: $code,
        setupHint: $hint
      }
    }' > "$ERROR_ABS"
}

write_output_payload() {
  local backend="$1"
  local session_id="$2"

  if [[ -s "$STDOUT_ABS" ]] && jq -e . "$STDOUT_ABS" >/dev/null 2>&1; then
    jq -n \
      --arg backend "$backend" \
      --arg sessionId "$session_id" \
      --arg outputMode "$OUTPUT_MODE" \
      --slurpfile payload "$STDOUT_ABS" \
      '{
        backend: $backend,
        sessionId: $sessionId,
        outputMode: $outputMode,
        result: $payload[0]
      }' > "$OUTPUT_ABS"
    return 0
  fi

  local stdout_text
  stdout_text="$(cat "$STDOUT_ABS" 2>/dev/null || true)"
  jq -n \
    --arg backend "$backend" \
    --arg sessionId "$session_id" \
    --arg outputMode "$OUTPUT_MODE" \
    --arg text "$stdout_text" \
    '{
      backend: $backend,
      sessionId: $sessionId,
      outputMode: $outputMode,
      result: (if ($text | length) > 0 then { text: $text } else {} end)
    }' > "$OUTPUT_ABS"
}

run_host_backend() {
  local session_id="$1"
  local prompt="$2"
  local provider="$3"
  local model="$4"
  local output_mode="$5"

  local cmd=(agent-browser prompt "$prompt" --session "$session_id" --save-session --output "$output_mode")
  if [[ -n "$provider" ]]; then
    cmd+=(--provider "$provider")
  fi
  if [[ -n "$model" ]]; then
    cmd+=(--model "$model")
  fi
  local -a passthrough_args=()
  while IFS= read -r arg; do
    passthrough_args+=("$arg")
  done < <(jq -r '.browser.args // [] | .[]' "$TASK_JSON")
  if [[ "${#passthrough_args[@]}" -gt 0 ]]; then
    cmd+=("${passthrough_args[@]}")
  fi

  set +e
  "${cmd[@]}" >"$STDOUT_ABS" 2>"$STDERR_ABS"
  local exit_code=$?
  set -e
  return "$exit_code"
}

run_container_backend() {
  local session_id="$1"
  local prompt="$2"
  local provider="$3"
  local model="$4"
  local output_mode="$5"
  local container_id="$6"

  local -a cmd
  if [[ -n "${BABYSITTER_BROWSER_CONTAINER_EXEC_PREFIX:-}" ]]; then
    local -a prefix
    read -r -a prefix <<< "${BABYSITTER_BROWSER_CONTAINER_EXEC_PREFIX}"
    cmd=("${prefix[@]}" agent-browser prompt "$prompt" --session "$session_id" --save-session --output "$output_mode")
  else
    cmd=(container exec "$container_id" agent-browser prompt "$prompt" --session "$session_id" --save-session --output "$output_mode")
  fi

  if [[ -n "$provider" ]]; then
    cmd+=(--provider "$provider")
  fi
  if [[ -n "$model" ]]; then
    cmd+=(--model "$model")
  fi
  local -a passthrough_args=()
  while IFS= read -r arg; do
    passthrough_args+=("$arg")
  done < <(jq -r '.browser.args // [] | .[]' "$TASK_JSON")
  if [[ "${#passthrough_args[@]}" -gt 0 ]]; then
    cmd+=("${passthrough_args[@]}")
  fi

  set +e
  "${cmd[@]}" >"$STDOUT_ABS" 2>"$STDERR_ABS"
  local exit_code=$?
  set -e
  return "$exit_code"
}

if [[ -n "$SELECTION_ERROR" ]] || [[ -z "$BACKEND" ]]; then
  write_error "${SELECTION_ERROR:-No runtime backend selected}" 1 "" ""
  write_metadata "error" 1 "" ""
  echo "[browser-executor] Runtime selection failed: ${SELECTION_ERROR:-unknown}" >&2
  exit 12
fi

if ! SESSION_ID="$(brt_resolve_session_id "$RUN_DIR" "$RUN_ID" "$SESSION_MODE" "$CUSTOM_SESSION_ID" "$EFFECT_ID")"; then
  write_error "Failed to resolve browser session id" 1 "$BACKEND" ""
  write_metadata "error" 1 "$BACKEND" ""
  echo "[browser-executor] Failed to resolve session id" >&2
  exit 13
fi

if [[ "$BACKEND" == "container" ]]; then
  CONTAINER_ID="$(brt_prepare_container_runtime "$RUN_DIR" "$RUN_ID")"
fi

brt_record_runtime_state \
  "$RUN_DIR" \
  "$RUN_ID" \
  "$BACKEND" \
  "$SESSION_ID" \
  "$NORMALIZED_RUNTIME" \
  "$SELECTION_REASON" \
  "$CONTAINER_ID"

EXIT_CODE=1
EFFECTIVE_BACKEND="$BACKEND"

if [[ "$BACKEND" == "container" ]]; then
  if run_container_backend "$SESSION_ID" "$PROMPT" "$PROVIDER" "$MODEL" "$OUTPUT_MODE" "$CONTAINER_ID"; then
    EXIT_CODE=0
  else
    EXIT_CODE=$?
    if [[ "$NORMALIZED_RUNTIME" == "auto" ]] && [[ "$HOST_READY" == "true" ]]; then
      FALLBACK_USED="true"
      FALLBACK_REASON="container-runtime-failed-fallback-host"
      EFFECTIVE_BACKEND="host"
      echo "[browser-executor] Container runtime failed (exit=$EXIT_CODE), falling back to host backend" >&2
      if run_host_backend "$SESSION_ID" "$PROMPT" "$PROVIDER" "$MODEL" "$OUTPUT_MODE"; then
        EXIT_CODE=0
        brt_record_runtime_state \
          "$RUN_DIR" \
          "$RUN_ID" \
          "host" \
          "$SESSION_ID" \
          "$NORMALIZED_RUNTIME" \
          "$FALLBACK_REASON" \
          "$CONTAINER_ID"
      else
        EXIT_CODE=$?
      fi
    fi
  fi
else
  if run_host_backend "$SESSION_ID" "$PROMPT" "$PROVIDER" "$MODEL" "$OUTPUT_MODE"; then
    EXIT_CODE=0
  else
    EXIT_CODE=$?
  fi
fi

if [[ "$EXIT_CODE" -eq 0 ]]; then
  write_output_payload "$EFFECTIVE_BACKEND" "$SESSION_ID"
  write_metadata "ok" 0 "$EFFECTIVE_BACKEND" "$SESSION_ID"
  echo "[browser-executor] Completed effect $EFFECT_ID with backend=$EFFECTIVE_BACKEND session=$SESSION_ID" >&2
  exit 0
fi

write_error "agent-browser execution failed" "$EXIT_CODE" "$EFFECTIVE_BACKEND" "$SESSION_ID"
write_metadata "error" "$EXIT_CODE" "$EFFECTIVE_BACKEND" "$SESSION_ID"
echo "[browser-executor] Execution failed for effect $EFFECT_ID (backend=$EFFECTIVE_BACKEND, exit=$EXIT_CODE)" >&2
exit "$EXIT_CODE"
