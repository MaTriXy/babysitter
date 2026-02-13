#!/usr/bin/env bash
# on-run-complete Secrets Guard Hook
# Scans run outputs and changed code for likely secrets and emits warnings.

set -euo pipefail

PAYLOAD="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  echo "[on-run-complete/secrets-guard] jq not found; skipping secret scan" >&2
  exit 0
fi

RUN_ID="$(echo "$PAYLOAD" | jq -r '.runId // empty')"
if [[ -z "$RUN_ID" ]]; then
  echo "[on-run-complete/secrets-guard] Missing runId in hook payload; skipping" >&2
  exit 0
fi

RUN_DIR=".a5c/runs/$RUN_ID"
if [[ ! -d "$RUN_DIR" ]]; then
  echo "[on-run-complete/secrets-guard] Run directory not found for $RUN_ID; skipping" >&2
  exit 0
fi

REPORT_DIR="$RUN_DIR/artifacts/security"
REPORT_MD="$REPORT_DIR/secrets-warning.md"
REPORT_JSON="$REPORT_DIR/secrets-detected.json"
mkdir -p "$REPORT_DIR"

declare -a PATTERN_LABELS=(
  "OpenAI key"
  "GitHub token"
  "AWS access key id"
  "Private key block"
  "Generic hardcoded credential"
)
declare -a PATTERN_REGEX=(
  'sk-(proj|live|test)?[A-Za-z0-9_-]{20,}'
  '(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})'
  '(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16})'
  '-----BEGIN[[:space:]][A-Z0-9[:space:]]*PRIVATE KEY-----'
  '([A-Za-z0-9_.-]*(api[_-]?key|secret|token|password|passwd|client[_-]?secret|access[_-]?token)[A-Za-z0-9_.-]*[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{16,}["'"'"'])'
)

is_text_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  LC_ALL=C grep -Iq . "$file"
}

collect_candidate_files() {
  local run_dir="$1"

  {
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null || true
      git ls-files --others --exclude-standard 2>/dev/null || true
    fi

    if [[ -d "$run_dir/tasks" ]]; then
      find "$run_dir/tasks" -type f \
        \( -name "*.json" -o -name "*.md" -o -name "*.txt" -o -name "*.log" -o -name "*.yaml" -o -name "*.yml" \)
    fi

    if [[ -d "$run_dir/artifacts" ]]; then
      find "$run_dir/artifacts" -type f
    fi
  } | awk 'NF' | sort -u
}

declare -a findings
total_findings=0

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  [[ "$file" == *"/.git/"* ]] && continue
  [[ "$file" == *"/node_modules/"* ]] && continue
  [[ "$file" == "$REPORT_MD" ]] && continue
  [[ "$file" == "$REPORT_JSON" ]] && continue

  if ! is_text_file "$file"; then
    continue
  fi

  for idx in "${!PATTERN_REGEX[@]}"; do
    label="${PATTERN_LABELS[$idx]}"
    regex="${PATTERN_REGEX[$idx]}"

    match_lines="$(grep -En -- "$regex" "$file" | grep -Ev 'babysitter:allow-secret|allowlist secret' || true)"
    if [[ -n "$match_lines" ]]; then
      line_list="$(echo "$match_lines" | cut -d: -f1 | sort -un | paste -sd, -)"
      findings+=("$file|$label|$line_list")
      total_findings=$((total_findings + 1))
    fi
  done
done < <(collect_candidate_files "$RUN_DIR")

if [[ "$total_findings" -eq 0 ]]; then
  rm -f "$REPORT_MD" "$REPORT_JSON"
  echo "[on-run-complete/secrets-guard] No potential secrets found for run $RUN_ID" >&2
  exit 0
fi

{
  echo "# Potential Secrets Detected"
  echo
  echo "Run: \`$RUN_ID\`"
  echo
  echo "The following files contain content that looks like credentials or secrets."
  echo "Do not commit these values. Rotate any real secrets immediately."
  echo
  echo "| File | Pattern | Lines |"
  echo "|---|---|---|"
  for entry in "${findings[@]}"; do
    file="${entry%%|*}"
    rest="${entry#*|}"
    label="${rest%%|*}"
    lines="${rest##*|}"
    echo "| \`$file\` | $label | $lines |"
  done
  echo
  echo "If this is a known-safe fixture, annotate the line with \`babysitter:allow-secret\`."
} > "$REPORT_MD"

{
  echo "{"
  echo "  \"runId\": \"${RUN_ID}\","
  echo "  \"findings\": ${total_findings},"
  echo "  \"report\": \"${REPORT_MD}\","
  echo "  \"items\": ["
  for i in "${!findings[@]}"; do
    entry="${findings[$i]}"
    file="${entry%%|*}"
    rest="${entry#*|}"
    label="${rest%%|*}"
    lines="${rest##*|}"
    comma=","
    if [[ "$i" -eq $((${#findings[@]} - 1)) ]]; then
      comma=""
    fi
    echo "    {\"file\":\"${file}\",\"pattern\":\"${label}\",\"lines\":\"${lines}\"}${comma}"
  done
  echo "  ]"
  echo "}"
} > "$REPORT_JSON"

echo "[on-run-complete/secrets-guard] WARNING: ${total_findings} potential secret match(es) detected. See ${REPORT_MD}" >&2
for entry in "${findings[@]}"; do
  file="${entry%%|*}"
  rest="${entry#*|}"
  label="${rest%%|*}"
  lines="${rest##*|}"
  echo "[on-run-complete/secrets-guard] ${file} (${label}) lines: ${lines}" >&2
done

exit 0
