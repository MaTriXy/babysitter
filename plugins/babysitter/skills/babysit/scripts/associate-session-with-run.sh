#!/bin/bash

# Associate Session with Babysitter Run
# Updates the in-session loop state file with a run ID

set -euo pipefail

RUN_ID=""
CLAUDE_SESSION_ID_ARG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      cat << 'HELP_EOF'
Associate Session with Babysitter Run

USAGE:
  associate-session-with-run.sh --run-id <id> --claude-session-id <id>

REQUIRED:
  --run-id <id>             Run ID to associate with session
  --claude-session-id <id>  Session ID

DESCRIPTION:
  Updates the in-session loop state file to associate it with a babysitter run.
  This allows the stop hook to query run status and detect completion.

  Typical workflow:
  1. Call 'babysitter run:create ...' to create run (get runId)
  2. Call this script to associate session with the run
  3. Continue with 'babysitter run:iterate' loop

EXAMPLES:
  associate-session-with-run.sh \
    --run-id run-20260121-abc123 \
    --claude-session-id "${CLAUDE_SESSION_ID}"
HELP_EOF
      exit 0
      ;;
    --run-id)
      RUN_ID="$2"
      shift 2
      ;;
    --claude-session-id)
      CLAUDE_SESSION_ID_ARG="$2"
      shift 2
      ;;
    *)
      echo "❌ Error: Unknown argument: $1" >&2
      echo "   Use --help for usage information" >&2
      exit 1
      ;;
  esac
done

# Validate required arguments
if [[ -z "$RUN_ID" ]]; then
  echo "❌ Error: --run-id is required" >&2
  exit 1
fi

if [[ -z "$CLAUDE_SESSION_ID_ARG" ]]; then
  echo "❌ Error: --claude-session-id is required" >&2
  exit 1
fi

# Determine state directory
if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  STATE_DIR="$CLAUDE_PLUGIN_ROOT/skills/babysit/state"
else
  # Fallback: derive from script location
  STATE_DIR="$(dirname "$(dirname "$0")")/state"
fi

STATE_FILE="$STATE_DIR/${CLAUDE_SESSION_ID_ARG}.md"

# Check if state file exists
if [[ ! -f "$STATE_FILE" ]]; then
  echo "❌ Error: No active babysitter session found" >&2
  echo "   Expected state file: $STATE_FILE" >&2
  echo "" >&2
  echo "   You must first call setup-babysitter-run.sh to initialize the session." >&2
  exit 1
fi

# Prevent re-entrant association in the same session
EXISTING_RUN_ID=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$STATE_FILE" | grep '^run_id:' | sed 's/run_id: *//' | sed 's/^"\(.*\)"$/\1/')
if [[ -n "${EXISTING_RUN_ID:-}" ]]; then
  echo "❌ Error: This session is already associated with run: $EXISTING_RUN_ID" >&2
  echo "   Stop the current babysitter run or use a new session before associating another." >&2
  exit 1
fi

# Update run_id in state file
# Create temp file, then atomically replace
TEMP_FILE="${STATE_FILE}.tmp.$$"

# Use awk to update or add run_id field in YAML frontmatter
awk -v run_id="$RUN_ID" '
  BEGIN { in_frontmatter=0; found_run_id=0; frontmatter_end=0 }
  /^---$/ { 
    if (in_frontmatter == 0) {
      in_frontmatter=1
      print
      next
    } else {
      if (found_run_id == 0 && frontmatter_end == 0) {
        print "run_id: \"" run_id "\""
      }
      frontmatter_end=1
      in_frontmatter=0
      print
      next
    }
  }
  in_frontmatter == 1 && /^run_id:/ {
    print "run_id: \"" run_id "\""
    found_run_id=1
    next
  }
  { print }
' "$STATE_FILE" > "$TEMP_FILE"

mv "$TEMP_FILE" "$STATE_FILE"

echo "✅ Associated session with run: $RUN_ID"
echo "   State file: $STATE_FILE"
