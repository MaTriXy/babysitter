#!/bin/bash
# Browser runtime selection + run-scoped state helpers.

set -euo pipefail

RUNTIME_STATE_SCHEMA="2026.02.browser-runtime-v1"

brt_now_iso() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

brt_state_file_for_run() {
  local run_dir="$1"
  echo "$run_dir/state/browser-runtime.json"
}

brt_sanitize_identifier() {
  local raw="${1:-}"
  local sanitized
  sanitized=$(printf "%s" "$raw" | tr -cs 'A-Za-z0-9._-' '-')
  sanitized="${sanitized#-}"
  sanitized="${sanitized%-}"
  if [[ -z "$sanitized" ]]; then
    sanitized="browser-session"
  fi
  echo "$sanitized"
}

brt_bool() {
  local raw="${1:-}"
  local lowered
  lowered="$(printf "%s" "$raw" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    1|true|yes|on) echo "true" ;;
    *) echo "false" ;;
  esac
}

brt_is_supported_macos_arm64() {
  local os arch major
  os="$(uname -s 2>/dev/null || true)"
  arch="$(uname -m 2>/dev/null || true)"
  if [[ "$os" != "Darwin" ]] || [[ "$arch" != "arm64" ]]; then
    echo "false"
    return 0
  fi
  major="$(sw_vers -productVersion 2>/dev/null | awk -F. '{print $1}' || echo "0")"
  if [[ "$major" =~ ^[0-9]+$ ]] && (( major >= 15 )); then
    echo "true"
  else
    echo "false"
  fi
}

brt_has_command() {
  local cmd="${1:-}"
  command -v "$cmd" >/dev/null 2>&1
}

brt_normalize_runtime() {
  local requested="${1:-}"
  case "$requested" in
    auto|container|host) echo "$requested" ;;
    *)
      local env_default="${BABYSITTER_BROWSER_RUNTIME:-auto}"
      case "$env_default" in
        auto|container|host) echo "$env_default" ;;
        *) echo "auto" ;;
      esac
      ;;
  esac
}

brt_normalize_session_mode() {
  local requested="${1:-}"
  case "$requested" in
    run|task|custom) echo "$requested" ;;
    *) echo "run" ;;
  esac
}

brt_select_backend() {
  local requested="${1:-auto}"
  local normalized
  normalized="$(brt_normalize_runtime "$requested")"

  local supported_macos_arm64 container_cli host_cli container_ready host_ready
  supported_macos_arm64="$(brt_is_supported_macos_arm64)"
  if brt_has_command container; then container_cli="true"; else container_cli="false"; fi
  if brt_has_command agent-browser; then host_cli="true"; else host_cli="false"; fi

  if [[ "$supported_macos_arm64" == "true" ]] && [[ "$container_cli" == "true" ]]; then
    container_ready="true"
  else
    container_ready="false"
  fi
  host_ready="$host_cli"

  local allow_container_fallback container_required
  allow_container_fallback="$(brt_bool "${BABYSITTER_BROWSER_CONTAINER_ALLOW_HOST_FALLBACK:-false}")"
  container_required="$(brt_bool "${BABYSITTER_BROWSER_CONTAINER_REQUIRED:-false}")"

  local backend="" reason="" error=""

  if [[ "$normalized" == "host" ]]; then
    if [[ "$host_ready" == "true" ]]; then
      backend="host"
      reason="host-requested"
    else
      error="agent-browser CLI was not found in PATH"
      reason="host-unavailable"
    fi
  elif [[ "$normalized" == "container" ]]; then
    if [[ "$container_ready" == "true" ]]; then
      backend="container"
      reason="container-requested"
    elif [[ "$allow_container_fallback" == "true" ]] && [[ "$host_ready" == "true" ]]; then
      backend="host"
      reason="container-unavailable-fallback-host"
    else
      error="Apple Container runtime is unavailable"
      reason="container-unavailable"
    fi
  else
    if [[ "$container_ready" == "true" ]]; then
      backend="container"
      reason="auto-container"
    elif [[ "$container_required" == "true" ]]; then
      error="Container runtime required but unavailable (set BABYSITTER_BROWSER_CONTAINER_REQUIRED=false to allow host fallback)"
      reason="container-required-unavailable"
    elif [[ "$host_ready" == "true" ]]; then
      backend="host"
      reason="auto-host-fallback"
    else
      error="No browser runtime available (container and host unavailable)"
      reason="no-runtime-available"
    fi
  fi

  jq -n \
    --arg requestedRuntime "$normalized" \
    --arg backend "$backend" \
    --arg reason "$reason" \
    --arg error "$error" \
    --argjson containerReady "$container_ready" \
    --argjson hostReady "$host_ready" \
    --argjson supportedMac "$supported_macos_arm64" \
    --argjson containerCli "$container_cli" \
    --argjson allowContainerFallback "$allow_container_fallback" \
    --argjson containerRequired "$container_required" \
    '{
      requestedRuntime: $requestedRuntime,
      backend: (if ($backend | length) > 0 then $backend else null end),
      reason: $reason,
      error: (if ($error | length) > 0 then $error else null end),
      checks: {
        supportedMacArm64: $supportedMac,
        containerCli: $containerCli,
        containerReady: $containerReady,
        hostReady: $hostReady
      },
      policy: {
        allowContainerFallback: $allowContainerFallback,
        containerRequired: $containerRequired
      }
    }'
}

brt_load_state() {
  local run_dir="$1"
  local state_file
  state_file="$(brt_state_file_for_run "$run_dir")"
  if [[ -f "$state_file" ]]; then
    jq -c '.' "$state_file" 2>/dev/null || echo '{}'
  else
    echo '{}'
  fi
}

brt_save_state() {
  local run_dir="$1"
  local state_json="$2"
  local state_file
  state_file="$(brt_state_file_for_run "$run_dir")"
  mkdir -p "$(dirname "$state_file")"
  printf "%s\n" "$state_json" | jq '.' > "$state_file"
}

brt_container_id_for_run() {
  local run_id="$1"
  local configured="${BABYSITTER_BROWSER_CONTAINER_ID:-}"
  if [[ -n "$configured" ]]; then
    echo "$configured"
    return 0
  fi
  local safe
  safe="$(brt_sanitize_identifier "$run_id")"
  echo "babysitter-browser-${safe}"
}

brt_prepare_container_runtime() {
  local run_dir="$1"
  local run_id="$2"
  local state_json container_id now
  now="$(brt_now_iso)"
  state_json="$(brt_load_state "$run_dir")"

  container_id="$(echo "$state_json" | jq -r '.container.id // empty')"
  if [[ -z "$container_id" ]]; then
    container_id="$(brt_container_id_for_run "$run_id")"
  fi

  # Best-effort runtime initialization. `container exec` may still fail later if
  # the selected container does not exist/configuration is incomplete.
  container system start >/dev/null 2>&1 || true

  state_json="$(
    echo "$state_json" | jq -c \
      --arg schemaVersion "$RUNTIME_STATE_SCHEMA" \
      --arg runId "$run_id" \
      --arg containerId "$container_id" \
      --arg now "$now" \
      '
      .schemaVersion = $schemaVersion
      | .runId = $runId
      | .container.id = $containerId
      | .container.initializedAt = (.container.initializedAt // $now)
      | .updatedAt = $now
      '
  )"
  brt_save_state "$run_dir" "$state_json"
  echo "$container_id"
}

brt_resolve_session_id() {
  local run_dir="$1"
  local run_id="$2"
  local session_mode="$3"
  local custom_session_id="${4:-}"
  local effect_id="$5"
  local state_json session_id normalized_mode

  normalized_mode="$(brt_normalize_session_mode "$session_mode")"
  state_json="$(brt_load_state "$run_dir")"

  if [[ "$normalized_mode" == "task" ]]; then
    session_id="task-$(brt_sanitize_identifier "$effect_id")"
    echo "$session_id"
    return 0
  fi

  if [[ "$normalized_mode" == "custom" ]]; then
    if [[ -z "$custom_session_id" ]]; then
      echo "custom sessionMode requires browser.sessionId" >&2
      return 1
    fi
    echo "$(brt_sanitize_identifier "$custom_session_id")"
    return 0
  fi

  session_id="$(echo "$state_json" | jq -r '.sessionId // empty')"
  if [[ -n "$session_id" ]]; then
    echo "$session_id"
    return 0
  fi

  session_id="run-$(brt_sanitize_identifier "$run_id")"
  echo "$session_id"
}

brt_record_runtime_state() {
  local run_dir="$1"
  local run_id="$2"
  local backend="$3"
  local session_id="$4"
  local requested_runtime="$5"
  local reason="${6:-}"
  local container_id="${7:-}"
  local state_json now
  now="$(brt_now_iso)"
  state_json="$(brt_load_state "$run_dir")"

  state_json="$(
    echo "$state_json" | jq -c \
      --arg schemaVersion "$RUNTIME_STATE_SCHEMA" \
      --arg runId "$run_id" \
      --arg backend "$backend" \
      --arg sessionId "$session_id" \
      --arg requestedRuntime "$requested_runtime" \
      --arg reason "$reason" \
      --arg containerId "$container_id" \
      --arg now "$now" \
      '
      .schemaVersion = $schemaVersion
      | .runId = $runId
      | .backend = $backend
      | .sessionId = $sessionId
      | .requestedRuntime = $requestedRuntime
      | .updatedAt = $now
      | .createdAt = (.createdAt // $now)
      | .lastSelectionReason = (if ($reason | length) > 0 then $reason else .lastSelectionReason end)
      | (if ($containerId | length) > 0 then .container.id = $containerId else . end)
      '
  )"
  brt_save_state "$run_dir" "$state_json"
}
