# Journal System: Event Sourcing and Audit Trail

**Version:** 1.1
**Last Updated:** 2026-01-26
**Category:** Feature Guide

---

## In Plain English

**The journal is a diary of everything that happens during a run.**

Every time the AI does something - writes code, runs tests, asks for approval - it gets recorded in the journal. This means:

- **Nothing is lost**: If your computer crashes, you can pick up where you left off
- **You can see what happened**: "Why did it do that?" → check the journal
- **You have proof**: For compliance or debugging, you have a complete record

**Where is it?** Look in `.a5c/runs/<your-run-id>/journal/` - each file is one event.

**Tip for beginners:** You don't need to understand the journal to use Babysitter. It works automatically. But when something goes wrong, the journal helps you figure out why.

---

## Overview

The journal system is Babysitter's event-sourced persistence layer. Every state change in a workflow is recorded as an immutable event in the journal. This append-only log serves as the single source of truth, enabling deterministic replay, debugging, audit trails, and resumption from any point.

### Why Use the Journal System

- **Complete Audit Trail**: Every action and decision is recorded permanently
- **Deterministic Replay**: Reproduce exact execution by replaying events
- **Time-Travel Debugging**: Inspect state at any point in history
- **Git-Friendly**: One event per file minimizes merge conflicts
- **Compliance**: Meets audit requirements for regulated environments
- **Resumption**: Rebuild state from journal to continue interrupted workflows

---

## Use Cases and Scenarios

### Scenario 1: Debugging a Failed Run

Investigate what happened when a workflow failed.

```bash
# View all events
babysitter run:events 01KFFTSF8TK8C9GT3YM9QYQ6WG --json | jq '.events[]'

# Find the failure event
babysitter run:events 01KFFTSF8TK8C9GT3YM9QYQ6WG --filter-type RUN_FAILED --json

# See events leading up to failure
babysitter run:events 01KFFTSF8TK8C9GT3YM9QYQ6WG --limit 10 --reverse --json
```

### Scenario 2: Audit Compliance Reporting

Generate an audit report of all human approvals in a workflow.

```bash
# Extract all breakpoint events
jq 'select(.type | contains("BREAKPOINT"))' \
  .a5c/runs/*/journal/*.json \
  > audit-report.json
```

### Scenario 3: Quality Score Tracking

Track quality scores across iterations for trend analysis.

```bash
# Extract quality scores from all iterations
jq 'select(.type == "QUALITY_SCORE") | {iteration: .payload.iteration, score: .payload.score}' \
  .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/*.json
```

### Scenario 4: Performance Analysis

Analyze task execution times to identify bottlenecks.

```bash
# Calculate task durations
jq -s '
  [.[] | select(.type == "EFFECT_RESOLVED")] |
  map({effectId: .payload.effectId, duration: (.payload.finishedAt | fromdateiso8601) - (.payload.startedAt | fromdateiso8601)}) |
  sort_by(.duration) |
  reverse
' .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/*.json
```

---

## Step-by-Step Instructions

### Step 1: Understand the Journal Structure

The journal is stored in the `journal/` directory within each run.

```
.a5c/runs/<runId>/
├── journal/
│   ├── 000001.<ulid>.json    # Event 1
│   ├── 000002.<ulid>.json    # Event 2
│   ├── 000003.<ulid>.json    # Event 3
│   └── ...
├── state/
│   └── state.json            # Derived cache (gitignored)
├── tasks/
│   └── <effectId>/
│       ├── task.json
│       └── result.json
└── run.json
```

**File naming convention:**
```
<sequence>.<ulid>.json
```

- `sequence`: 6-digit zero-padded number (000001, 000002, ...)
- `ulid`: Unique Lexicographically Sortable Identifier
- Example: `000042.01HJKMNPQR3STUVWXYZ012345.json`

### Step 2: View Journal Events

Use the CLI or read files directly.

**Via CLI (recommended):**
```bash
# View all events
babysitter run:events 01KFFTSF8TK8C9GT3YM9QYQ6WG --json

# View last 10 events
babysitter run:events 01KFFTSF8TK8C9GT3YM9QYQ6WG --limit 10 --reverse

# Filter by event type
babysitter run:events 01KFFTSF8TK8C9GT3YM9QYQ6WG --filter-type EFFECT_RESOLVED --json
```

**Via file system:**
```bash
# List all event files
ls -la .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/

# Read a specific event
cat .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/000001.*.json | jq .
```

### Step 3: Understand Event Types

Learn the different event types recorded in the journal.

**Run lifecycle events:**
- `RUN_CREATED` - Run initialized
- `RUN_COMPLETED` - Run finished successfully
- `RUN_FAILED` - Run terminated with error

**Effect (task) events:**
- `EFFECT_REQUESTED` - Task requested for execution
- `EFFECT_RESOLVED` - Task completed (success or error)

**Quality events:**
- `QUALITY_SCORE` - Quality assessment recorded

**Breakpoint events:**
- `BREAKPOINT_REQUESTED` - Human approval requested
- `BREAKPOINT_APPROVED` - Approval granted
- `BREAKPOINT_REJECTED` - Approval denied

### Step 4: Query the Journal

Use jq or other tools to query and analyze events.

```bash
# Count events by type
jq -s 'group_by(.type) | map({type: .[0].type, count: length})' \
  .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/*.json

# Find all failed tasks
jq 'select(.type == "EFFECT_RESOLVED" and .payload.status == "error")' \
  .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/*.json

# Get timeline of events
jq '{seq, type, ts}' .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/*.json
```

### Step 5: Rebuild State from Journal

If the state cache is corrupted, rebuild it from the journal.

```bash
# Delete corrupted state
rm .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/state/state.json

# Any CLI command will rebuild state automatically
babysitter run:status 01KFFTSF8TK8C9GT3YM9QYQ6WG
```

---

## Configuration Options

### Event Schema

All events share a common base structure:

```typescript
type JournalEventBase = {
  seq: number;       // Monotonically increasing sequence number
  id: string;        // ULID (unique identifier)
  ts: string;        // ISO 8601 timestamp
  type: string;      // Event type
};
```

### RUN_CREATED Event

```typescript
type RunCreated = JournalEventBase & {
  type: "RUN_CREATED";
  payload: {
    runId: string;
    processId: string;
    processRevision?: string;
    entrypoint: {
      importPath: string;
      exportName: string;
    };
    inputsRef?: string;
  };
};
```

### EFFECT_REQUESTED Event

```typescript
type EffectRequested = JournalEventBase & {
  type: "EFFECT_REQUESTED";
  payload: {
    effectId: string;
    invocationKey: string;
    stepId: string;
    taskId: string;
    kind: string;           // "node", "breakpoint", "orchestrator_task"
    label?: string;
    taskDefRef: string;
    inputsRef?: string;
  };
};
```

### EFFECT_RESOLVED Event

```typescript
type EffectResolved = JournalEventBase & {
  type: "EFFECT_RESOLVED";
  payload: {
    effectId: string;
    status: "ok" | "error";
    resultRef?: string;
    error?: {
      name: string;
      message: string;
      stack?: string;
      data?: any;
    };
    stdoutRef?: string;
    stderrRef?: string;
    startedAt?: string;
    finishedAt?: string;
  };
};
```

### RUN_COMPLETED / RUN_FAILED Events

```typescript
type RunCompleted = JournalEventBase & {
  type: "RUN_COMPLETED";
  payload: {
    outputRef?: string;
  };
};

type RunFailed = JournalEventBase & {
  type: "RUN_FAILED";
  payload: {
    error: {
      name: string;
      message: string;
      stack?: string;
      data?: any;
    };
  };
};
```

---

## Code Examples and Best Practices

### Example 1: Read All Events in a Run

```bash
#!/bin/bash
RUN_ID="01KFFTSF8TK8C9GT3YM9QYQ6WG"
JOURNAL_DIR=".a5c/runs/$RUN_ID/journal"

# Read and sort events by sequence number
for f in "$JOURNAL_DIR"/*.json; do
  cat "$f"
done | jq -s 'sort_by(.seq)'
```

### Example 2: Extract Audit Trail

Generate a human-readable audit trail:

```bash
jq -r '
  "\(.ts) [\(.type)] " +
  (if .type == "RUN_CREATED" then "Run started: \(.payload.processId)"
   elif .type == "EFFECT_REQUESTED" then "Task requested: \(.payload.taskId) (\(.payload.kind))"
   elif .type == "EFFECT_RESOLVED" then "Task completed: \(.payload.effectId) - \(.payload.status)"
   elif .type == "BREAKPOINT_APPROVED" then "Approved by human"
   elif .type == "RUN_COMPLETED" then "Run completed successfully"
   elif .type == "RUN_FAILED" then "Run failed: \(.payload.error.message)"
   else .type end)
' .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/*.json
```

**Output:**
```
2026-01-25T10:15:30.123Z [RUN_CREATED] Run started: feature/auth
2026-01-25T10:15:31.456Z [EFFECT_REQUESTED] Task requested: plan (agent)
2026-01-25T10:15:45.789Z [EFFECT_RESOLVED] Task completed: effect-001 - ok
2026-01-25T10:15:46.012Z [EFFECT_REQUESTED] Task requested: breakpoint (breakpoint)
2026-01-25T10:20:12.345Z [BREAKPOINT_APPROVED] Approved by human
2026-01-25T10:20:13.678Z [EFFECT_REQUESTED] Task requested: implement (agent)
2026-01-25T10:25:34.901Z [RUN_COMPLETED] Run completed successfully
```

### Example 3: Quality Score Trend Analysis

```bash
jq -s '
  [.[] | select(.type == "QUALITY_SCORE")] |
  map({iteration: .payload.iteration, score: .payload.score, ts: .ts}) |
  sort_by(.iteration)
' .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/*.json
```

**Output:**
```json
[
  {"iteration": 1, "score": 68, "ts": "2026-01-25T10:15:45.123Z"},
  {"iteration": 2, "score": 82, "ts": "2026-01-25T10:18:23.456Z"},
  {"iteration": 3, "score": 91, "ts": "2026-01-25T10:21:34.789Z"}
]
```

### Example 4: Find Long-Running Tasks

```bash
jq -s '
  [.[] | select(.type == "EFFECT_RESOLVED" and .payload.startedAt and .payload.finishedAt)] |
  map({
    effectId: .payload.effectId,
    durationSec: ((.payload.finishedAt | fromdateiso8601) - (.payload.startedAt | fromdateiso8601))
  }) |
  sort_by(.durationSec) |
  reverse |
  .[0:5]
' .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/*.json
```

### Example 5: Export Journal for External Analysis

```bash
# Export to single JSON file
jq -s '.' .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/*.json > events.json

# Export to CSV for spreadsheet analysis
jq -r '
  [.seq, .type, .ts, .payload.effectId // "", .payload.status // ""] |
  @csv
' .a5c/runs/01KFFTSF8TK8C9GT3YM9QYQ6WG/journal/*.json > events.csv
```

### Best Practices

1. **Never Manually Edit Journal Files**: The journal is append-only and immutable
2. **Use CLI Commands for Queries**: The CLI handles edge cases and formats output properly
3. **Archive Old Runs**: Completed runs can be archived to save disk space
4. **Monitor Journal Size**: Very long runs may generate large journals
5. **Use Filters for Large Journals**: Filter by event type for efficiency
6. **Back Up Before Cleanup**: Always backup before deleting old runs

---

## Common Pitfalls and Troubleshooting

### Pitfall 1: Manual Journal Editing

**Symptom:** Run behaves unexpectedly or fails to resume.

**Cause:** Direct edits to journal files.

**Solution:**
- Never edit journal files directly
- If corrupted, you may need to start a new run
- For state cache issues, delete `state/state.json` and let it rebuild

### Pitfall 2: Journal Too Large

**Symptom:** Slow performance when reading events.

**Cause:** Very long runs with many iterations.

**Solution:**
- Use `--limit` flag when querying
- Filter by specific event types
- Consider archiving completed runs

```bash
# Query with limits
babysitter run:events "$RUN_ID" --limit 100 --json

# Filter to specific type
babysitter run:events "$RUN_ID" --filter-type EFFECT_RESOLVED --limit 50 --json
```

### Pitfall 3: Missing State Cache

**Symptom:** CLI commands are slow on first access.

**Cause:** State cache doesn't exist or was deleted.

**Solution:**
- This is normal - state is derived from journal
- First CLI command will rebuild the cache
- Cache is stored in `state/state.json`

```bash
# Trigger state rebuild
babysitter run:status "$RUN_ID"
```

### Pitfall 4: Event Order Confusion

**Symptom:** Events appear out of order.

**Cause:** File system listing order differs from sequence order.

**Solution:**
- Always use the CLI or sort by `seq` field
- File names include sequence numbers for proper ordering

```bash
# Correct: sorted by sequence
jq -s 'sort_by(.seq)' .a5c/runs/"$RUN_ID"/journal/*.json

# Or use CLI which handles ordering
babysitter run:events "$RUN_ID" --json
```

### Pitfall 5: Journal Conflicts in Git

**Symptom:** Merge conflicts in journal files.

**Cause:** Multiple writers to same run (should not happen in normal use).

**Solution:**
- Babysitter uses single-writer model
- If conflicts occur, the later events are typically valid
- Consider using separate runs for parallel work

---

## How the Journal Works

### Event Sourcing Model

```
User Request
    │
    ▼
┌─────────────┐
│   Process   │ ──▶ Decisions (tasks, breakpoints, etc.)
└─────────────┘
    │
    ▼
┌─────────────┐
│   Journal   │ ◀── Append events (immutable)
│  (Events)   │
└─────────────┘
    │
    ▼
┌─────────────┐
│    State    │ ◀── Derived by replaying events
│  (Cache)    │
└─────────────┘
```

### State Reconstruction

On each iteration:
1. Load all journal events
2. Replay events to build state index
3. Process function starts from beginning
4. Intrinsics check state index:
   - If result exists: return cached result (short-circuit)
   - If pending: throw exception
   - If new: record event and throw exception

### Git-Friendly Design

- **One file per event**: Minimizes merge conflicts
- **Deterministic naming**: Sequence + ULID ensures ordering
- **Append-only**: No modifications to existing files
- **State cache gitignored**: Derived, not source of truth

---

## Related Documentation

- [Run Resumption](./run-resumption.md) - Understand how journal enables resumption
- [Process Definitions](./process-definitions.md) - How events are generated
- [Breakpoints](./breakpoints.md) - Breakpoint events in the journal

---

## Summary

The journal system is the foundation of Babysitter's reliability and auditability. Every action is recorded as an immutable event, enabling deterministic replay, debugging, compliance reporting, and seamless resumption. Use the CLI to query events, never edit journal files directly, and leverage the complete audit trail for debugging and analysis.
