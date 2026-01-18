# Babysitter (VS Code Extension)

Babysitter ships two complementary experiences:

1. **SDK + CLI** (`@a5c/babysitter-sdk` / `babysitter` binary) for building and replaying event-sourced processes with deterministic harnesses.
2. **VS Code extension** (this repo) for observing and steering `.a5c/runs/<runId>/` without leaving your editor.

Unless you only need the editor UI, start with the SDK/CLI quickstart below so your docs and walkthroughs match the deterministic harness behavior delivered in `packages/sdk`.

## SDK & CLI Quickstart

### Prerequisites
- Node.js **18.x or 20.x** (the deterministic harness and CLI smoke jobs run on both).
- macOS, Linux, or Windows (CLI always emits POSIX-style paths; Windows users should run via Git Bash/WSL for parity).
- `pnpm` for workspace commands (see `package.json` scripts).

### Install & bootstrap
```bash
# install the SDK + CLI in your workspace
pnpm add -D @a5c/babysitter-sdk

# build the package so the babysitter CLI is ready for docs walkthroughs
pnpm --filter @a5c/babysitter-sdk run build

# create a demo run using the CLI (matches sdk.md §§8–13 examples)
pnpm --filter @a5c/babysitter-sdk exec babysitter run:create \
  --process-id demo/sample \
  --entry examples/processes/sample.mjs#process \
  --inputs examples/inputs/sample.json
```

### Deterministic docs & harness workflow
- **CLI walkthroughs** (`docs/cli-examples.md`) are regenerated via  
  `pnpm --filter @a5c/babysitter-sdk run smoke:cli -- --runs-dir .a5c/runs/docs-cli --record docs/cli-examples/baselines`
- **Snippets** (`sdk.md` §§8–13, testing README) compile with  
  `pnpm --filter @a5c/babysitter-sdk run docs:snippets:tsc`
- **Fake runner examples** live in `packages/sdk/src/testing/README.md` and are validated with  
  `pnpm --filter @a5c/babysitter-sdk run docs:testing-readme`

Re-run those commands before editing docs so CLI transcripts, snippet hashes, and harness logs remain deterministic (see `part7_test_plan.md` for the full verification matrix).

## Docs Map
- **sdk.md §§8–13** – canonical orchestrator/CLI/API tables, metadata pairs, ambient helpers, and deterministic harness notes.
- **docs/cli-examples.md** – end-to-end CLI walkthrough generated via the smoke harness; includes redaction + Windows path guidance.
- **packages/sdk/src/testing/README.md** – detailed fake-runner + harness how-to (clock/ULID seeding, snapshot helpers).
- **README.md (this file)** – high-level landing page with SDK/CLI quickstart plus extension usage.

## VS Code Extension Overview

Babysitter is a VS Code extension for orchestrating and monitoring **`o` runs** from inside your editor.

### Why Babysitter + `o`

- **Quality-convergence loops inside VS Code** – every run follows the `act → score → breakpoint` loop from `o`, so you can watch iterations converge instead of hoping a single pass is “good enough”.
- **Event-sourced audit trail** – Babysitter surfaces `.a5c/runs/<run_id>/` (inputs, `journal.jsonl`, `state.json`, prompts, work summaries) so you can rerun, review, or share the exact history.
- **Repo-local orchestration for your favorite runner** – keep using `codex`, `claude-code`, `gemini`, or a custom CLI while Babysitter handles dispatch/resume, awaiting input, and artifact browsing.

It adds a **Babysitter Runs** view (Explorer sidebar), plus commands and webviews to:

- Dispatch new runs via `o`
- Monitor run state/events (`state.json`, `journal.jsonl`)
- Browse artifacts (`run/artifacts/`) and work summaries (`run/work_summaries/`)
- Resume existing runs or replay them from any breakpoint
- Respond when `o` is awaiting input (send text / Enter / Esc)
- Highlight quality gates by showing latest `score()` feedback inline
- Build prompts from `.a5c/processes/**` via a dedicated Prompt Builder UI

## Requirements

- VS Code: `^1.90.0`
- An `o` binary available via one of:
  - `<workspaceRoot>/o` (this repo includes an `o` file at `./o`), or
  - `PATH`, or
  - `babysitter.o.binaryPath`

Windows notes:

- WSL2 is recommended.
- If WSL isn't available, install Git Bash and set `babysitter.o.install.bashPath` to the full path of `bash.exe`.

## Installation

### Option A: Install from a VSIX (recommended for this repo)

If you already have a VSIX (this repo includes `babysitter-*.vsix` files at the root):

- VS Code UI: Extensions view → `...` → **Install from VSIX...**
- CLI:

```bash
code --install-extension babysitter-*.vsix
```

### Option B: Build and package a VSIX

```bash
npm ci
npm run package
code --install-extension babysitter-*.vsix
```

Notes:

- Packaging uses `vsce` (`npm run package`).
- If you change `PATH` (for `o`), fully restart VS Code so the extension host inherits the environment.

## Quickstart

1. Open a workspace that has (or will have) `.a5c/runs`.
2. Run **Command Palette** → `Babysitter: Activate (Log Output)`.
3. Confirm the **Output** panel has a `Babysitter` channel.
4. Run **Command Palette** → `Babysitter: Dispatch Run`.
5. Watch progress in:
   - **Explorer** → **Babysitter Runs**
   - `Babysitter: Open Run Details`
   - `Babysitter: Open Run Logs`

For a predictable walkthrough using the included fixture workspace, see `DEMO.md`.

Need a deeper dive into `o` + Babysitter? Read [`USER_GUIDE.md`](https://github.com/a5c-ai/babysitter/blob/main/USER_GUIDE.md) for the quality-convergence model, event-sourced runs, and troubleshooting tips.

## Continuous Releases

- Pushes to `main` automatically execute `.github/workflows/release.yml`, which reruns lint/tests/build/package, generates SHA256 checksums for the VSIX, bumps `package.json`/`CHANGELOG.md`, tags `vX.Y.Z`, and publishes a GitHub Release (workflow commits include `[skip release]` to avoid recursive runs).
- Helper scripts live in `scripts/`:
  - `bump-version.mjs`: determines the next semantic version (`#minor`/`#major` hints supported) and rolls the changelog.
  - `release-notes.mjs`: emits the latest changelog section for GitHub Releases/Marketplace copy.
  - `rollback-release.sh`: deletes a GitHub Release + tag (see below before re-opening changelog entries).
- Guardrails: all GitHub Actions are pinned to commit SHAs, VSIX artifacts are hashed/verified between jobs, and rollback automation is documented in [`docs/release-pipeline.md`](docs/release-pipeline.md) (includes secret ownership for `GITHUB_TOKEN`/`VSCE_PAT` and the operational checklist).
- To reverse a release: run `scripts/rollback-release.sh vX.Y.Z`, revert the associated release commit on `main`, and move the relevant notes back under `## [Unreleased]` in `CHANGELOG.md`.

## Core Concepts

### Runs and run folders

By default Babysitter discovers runs by scanning the runs root (default: `.a5c/runs`) for folders named like:

- `run-YYYYMMDD-HHMMSS`

Within a run folder, Babysitter commonly reads:

- `state.json` (current state)
- `journal.jsonl` (append-only event stream)
- `run/work_summaries/` (generated summaries)
- `run/artifacts/` (artifacts to browse/open)

Babysitter hyperlinks these artifacts so you can replay the **quality-convergence loop** for any run: open `prompts/` to see what the agent was asked, inspect `work_summaries/` to read the response, and review `journal.jsonl` to understand when breakpoints or scope pivots happened.

## Features

- **Runs Tree View** in Explorer with live refresh and context actions
- **Run Details** webview: metadata, state, journal tail, summaries, artifacts
- **Run Logs** webview: tails `journal.jsonl` and live `o` output when available
- **Dispatch / Resume** flows integrated with `o`
- **Awaiting Input** support (send text, Enter, Esc) via PTY
- **Prompt Builder** that scans `.a5c/processes/**/*.js` and helps generate prompts
- Resilient parsing for partial writes (e.g., a `journal.jsonl` line being written)

## Commands

| Title | Command ID |
| --- | --- |
| Babysitter: Activate (Log Output) | `babysitter.activate` |
| Babysitter: Dispatch Run | `babysitter.dispatchRun` |
| Babysitter: Dispatch Run from Task File | `babysitter.dispatchRunFromTaskFile` |
| Babysitter: Resume Run | `babysitter.resumeRun` |
| Babysitter: Send ESC to `o` | `babysitter.sendEsc` |
| Babysitter: Send Enter to `o` | `babysitter.sendEnter` |
| Babysitter: Locate `o` Binary | `babysitter.locateOBinary` |
| Babysitter: Install/Update `o` in Workspace | `babysitter.installOInWorkspace` |
| Babysitter: Show Configuration Errors | `babysitter.showConfigurationErrors` |
| Babysitter: Prompt Builder | `babysitter.openPromptBuilder` |
| Babysitter: Open Run Details | `babysitter.openRunDetails` |
| Babysitter: Open Run Logs | `babysitter.openRunLogs` |
| Babysitter: Reveal Run Folder in Explorer | `babysitter.revealRunFolder` |
| Babysitter: Refresh Runs | `babysitter.runs.refresh` |
| Babysitter: Archive Run | `babysitter.archiveRun` |
| Babysitter: Mark Run Completed | `babysitter.markRunComplete` |

## Keyboard shortcuts

Babysitter ships chorded shortcuts (press the first combo, then the second key):

- `Ctrl+Alt+B`, then `P`: Prompt Builder
- `Ctrl+Alt+B`, then `N`: Dispatch Run
- `Ctrl+Alt+B`, then `R`: Resume Run
- `Ctrl+Alt+B`, then `D`: Open Run Details
- `Ctrl+Alt+B`, then `L`: Open Run Logs
- `Ctrl+Alt+B`, then `Shift+R`: Refresh Runs
- `Ctrl+Alt+B`, then `Enter`: Send Enter to `o`
- `Ctrl+Alt+B`, then `Esc`: Send ESC to `o`

Inside webviews:

- Prompt Builder: `Ctrl+Enter` dispatch, `Ctrl+Shift+Enter` insert, `Ctrl+F` search, `Ctrl+L` focus request
- Run Details (awaiting input): `Ctrl+R` refresh, `Ctrl+Enter` send response, `Enter` send Enter, `Esc` send ESC, `/` focus input
- Run Logs: `Ctrl+F` focus filter, `Ctrl+L` clear active source, `Esc` clears filter

## Configuration

Settings are under the `babysitter` namespace.

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `babysitter.o.binaryPath` | `string` | `""` | Optional full path to `o` (or directory containing it). If empty, looks in workspace root, then `PATH`. |
| `babysitter.oPath` | `string` | `""` | Legacy alias for `babysitter.o.binaryPath`. |
| `babysitter.runsRoot` | `string` | `.a5c/runs` | Runs root directory (relative paths resolve from workspace root). |
| `babysitter.globalConfigPath` | `string` | `""` | Optional path to a JSON config file. Supported keys: `oBinaryPath`, `runsRoot`. |
| `babysitter.o.install.bashPath` | `string` | `""` | Windows only: path to `bash.exe` (Git Bash) for installing `o` when WSL isn't available. |
| `babysitter.dispatch.shellPath` | `string` | `""` | macOS/Linux: override the shell executable used for dispatch terminals. Defaults to `$SHELL` or `/bin/bash`. |
| `babysitter.dispatch.shellArgs` | `string \| string[]` | `['-l']` | macOS/Linux: extra shell arguments for dispatch terminals. Provide a string or array; set an empty array to disable the `-l` default. |

Example `settings.json`:

```jsonc
{
  "babysitter.runsRoot": ".a5c/runs",
  "babysitter.o.binaryPath": "./o"
}
```

Global config file example (point `babysitter.globalConfigPath` at this file):

```json
{
  "oBinaryPath": "C:/tools/o/o.exe",
  "runsRoot": ".a5c/runs"
}
```

## Usage Guide

### Runs View

Babysitter adds a **Babysitter Runs** TreeView in the Explorer sidebar.

- Click a run to open **Run Details**:
  - Key run metadata + parsed `state.json`
  - Latest `journal.jsonl` events
  - Work summaries (`run/work_summaries/`) with preview + open
  - Artifacts browser (`run/artifacts/`) with reveal + open
- Open streaming output/logs: `Babysitter: Open Run Logs`
- Context menu: resume, reveal folder, archive, mark completed

### Dispatch

- `Babysitter: Dispatch Run` invokes `o` with your request prompt.
- On macOS/Linux the command opens `o` inside a VS Code terminal so you can interact with prompts directly; adjust the shell via `babysitter.dispatch.shellPath` / `babysitter.dispatch.shellArgs`.
- Right-click any `.task.md` file in Explorer and choose **Babysitter: Dispatch Run from Task File** to send the trimmed file contents directly to `o`.
- For a guided UI, use `Babysitter: Prompt Builder`.

### Monitor

- Views auto-refresh on changes to `state.json`, `journal.jsonl`, and `run/artifacts/**` (debounced).

### Resume

- `Babysitter: Resume Run` selects a run and prompts for an updated request.

### Pause / Awaiting input

When `o` is awaiting input (breakpoints/prompts), Run Details shows an **Awaiting Input** card where you can:

- Send a response/steering instruction
- Send `Enter` / `Esc`

Babysitter runs `o` under a pseudo-terminal so interactive key presses work reliably.

### Prompt Builder / Process Catalog

`Babysitter: Prompt Builder` scans `.a5c/processes/**/*.js` and builds an in-memory catalog of exported process functions.

- Schema: `src/core/processCatalog.ts`
- Extraction: parses JS with the TypeScript AST to find exported functions/arrow functions, infer parameters/defaults/rest, and best-effort return-object keys; classifies kinds based on file paths.
- File drag/drop: drag files from the VS Code Explorer into the **Files** drop zone to include them in the prompt.
- Persistence: remembers last selected process, args, request, and files per workspace.

## Troubleshooting

### Babysitter can't find the `o` binary

Babysitter resolves `o` in this order:

1. Workspace root (`<workspaceRoot>/o`)
2. `PATH`
3. `babysitter.o.binaryPath` (or legacy `babysitter.oPath`)

Use:

- `Babysitter: Locate \`o\` Binary` to see what is being resolved
- `Babysitter: Show Configuration Errors` to see config validation output

If you changed `PATH`, fully restart VS Code.

### Installing/updating `o` in a workspace

`Babysitter: Install/Update \`o\` in Workspace` downloads and runs the upstream `o` installer (`curl | bash`) and installs into a selected workspace folder.

- Creates/updates `<workspaceRoot>/o` and `<workspaceRoot>/.a5c/*`
- May edit `<workspaceRoot>/.gitignore` unless you select `--no-gitignore`
- On Windows:
  - Prefers WSL automatically when available
  - Falls back to Git Bash if configured/detected

Security note: this command is gated by a modal consent prompt because it executes a downloaded script.

### Where to find logs

- VS Code: **View → Output** → select `Babysitter`
- If extension tests fail in CI, see workflow artifacts: `test-logs` and `vsix`

See also: `CONTRIBUTING.md` (debugging notes + what to include in bug reports/PRs).

## Security & Privacy

See `SECURITY.md`.

## Development

See `CONTRIBUTING.md` for setup, debugging, packaging, and PR expectations.

### Prerequisites

- Node.js 20+ (CI uses Node 20)
- npm

### Common tasks

```bash
npm install
npm run build
npm run watch
npm run lint
npm run format
npm test
npm run test:ci
npm run package
```

### Debug the extension

- Open this repo in VS Code
- Press `F5` to start an **Extension Development Host**
- Use the Command Palette commands listed above

Tip: for a predictable demo workspace, you can open `packages/vscode-extension/src/test/fixtures/workspace` in the Extension Development Host (it includes a minimal `.a5c/runs` fixture).

## Release notes

See `CHANGELOG.md`.

## License

`UNLICENSED` (see `LICENSE.txt`).
