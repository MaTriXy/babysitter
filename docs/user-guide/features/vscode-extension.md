# VSCode Extension

**Version:** 1.0
**Last Updated:** 2026-01-25
**Category:** Feature Guide

---

## Overview

The Babysitter VSCode Extension brings the full power of the Babysitter orchestration system directly into your editor. Monitor runs, dispatch new workflows, respond to breakpoints, and browse artifacts without leaving VSCode.

### Key Benefits

- **Integrated Workflow Management**: Dispatch, monitor, and resume runs from within VSCode
- **Real-Time Monitoring**: Watch run progress with live-updating tree views and webviews
- **Human-in-the-Loop Support**: Respond to breakpoints and awaiting input prompts directly in the editor
- **Artifact Browser**: Preview and open generated artifacts, work summaries, and prompts
- **Quality Convergence Visibility**: See score feedback and iteration progress inline

---

## Installation

### Prerequisites

- **VSCode**: Version 1.90.0 or newer
- **`o` binary**: Available via workspace root, `PATH`, or configured path

### Option A: Install from VSIX (Recommended)

If you have a VSIX file:

**Via VSCode UI:**
1. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Click the `...` menu at the top of the Extensions view
3. Select **Install from VSIX...**
4. Choose the `babysitter-*.vsix` file

**Via Command Line:**
```bash
code --install-extension babysitter-*.vsix
```

### Option B: Build from Source

```bash
cd packages/vscode-extension
npm ci
npm run package
code --install-extension babysitter-*.vsix
```

### Windows Setup Notes

- **WSL2** (Recommended): The extension works best with WSL2 on Windows
- **Git Bash Fallback**: If WSL is unavailable, install Git Bash and set `babysitter.o.install.bashPath` to the full path of `bash.exe`

---

## Quickstart

1. Open a workspace containing (or that will contain) a `.a5c/runs` directory
2. Run **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`) and execute `Babysitter: Activate (Log Output)`
3. Verify the **Output** panel shows a `Babysitter` channel
4. Dispatch your first run: **Command Palette** and execute `Babysitter: Dispatch Run`
5. Monitor progress in the **Babysitter Runs** view (Explorer sidebar)

---

## Key Features

### Runs Tree View

The **Babysitter Runs** TreeView appears in the Explorer sidebar and provides a live overview of all runs in your workspace.

**Capabilities:**

| Action | Description |
|--------|-------------|
| Click a run | Opens the Run Details webview |
| Double-click | Jump directly to `journal.jsonl` |
| Context menu | Resume, reveal folder, archive, mark completed |
| Refresh button | Manually refresh the runs list |

**Run States Displayed:**

- Active runs with current iteration/phase
- Awaiting input status (highlighted for attention)
- Completed runs with final status
- Quality scores from the latest `score()` feedback

### Run Details Webview

A rich panel showing comprehensive information about a selected run.

**Sections:**

| Section | Content |
|---------|---------|
| Metadata | Run ID, timestamps, process info |
| State | Parsed `state.json` with current phase/iteration |
| Journal | Latest events from `journal.jsonl` |
| Work Summaries | Agent outputs from `work_summaries/` with preview |
| Artifacts | Files from `artifacts/` with reveal/open actions |

**When Awaiting Input:**

An **Awaiting Input** card appears with options to:
- Type and send a response or steering instruction
- Send `Enter` to confirm
- Send `Esc` to cancel or skip

### Run Logs Webview

Streams live output from `journal.jsonl` and the `o` terminal output.

**Features:**
- Real-time event streaming
- Filterable log output
- Clear active source option

### Dispatch / Resume / Awaiting Input Workflows

#### Dispatching a New Run

**Method 1: Command Palette**
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Execute `Babysitter: Dispatch Run`
3. Enter your request prompt
4. The run starts in a VSCode terminal (macOS/Linux) allowing direct interaction

**Method 2: From Task File**
1. Right-click any `.task.md` file in the Explorer
2. Select **Babysitter: Dispatch Run from Task File**
3. The file contents are sent directly to `o`

**Method 3: Prompt Builder** (see below)

#### Resuming an Existing Run

1. Execute `Babysitter: Resume Run` from Command Palette
2. Select the run to resume from the picker
3. Optionally provide an updated request prompt
4. The run continues from its last state

#### Responding to Awaiting Input

When `o` pauses at a breakpoint or awaits input:

1. The Run Details webview shows an **Awaiting Input** card
2. You can:
   - Type a response in the text field and send
   - Click **Send Enter** to confirm with no additional input
   - Click **Send ESC** to cancel or escape the prompt

Alternatively, use keyboard shortcuts:
- `Ctrl+Alt+B`, then `Enter`: Send Enter to `o`
- `Ctrl+Alt+B`, then `Esc`: Send ESC to `o`

### Artifact Browser

Browse and interact with files generated during a run.

**Locations Scanned:**
- `run/artifacts/` - Deliverables like reports, JSON, docs
- `run/work_summaries/` - Agent outputs per function call
- `prompts/` - Agent prompts per function call

**Actions Available:**

| Action | Description |
|--------|-------------|
| Preview | View file contents in the webview |
| Open | Open the file in the VSCode editor |
| Reveal | Show the file in the file explorer |
| Copy Path | Copy the file path to clipboard |

### Prompt Builder

A guided UI for creating structured prompts from process definitions.

**To Open:**
- Command Palette: `Babysitter: Prompt Builder`
- Keyboard: `Ctrl+Alt+B`, then `P`

**Features:**

| Feature | Description |
|---------|-------------|
| Process Catalog | Scans `.a5c/processes/**/*.js` for exported process functions |
| Parameter Detection | Infers parameters, defaults, and rest arguments from code |
| File Drop Zone | Drag files from Explorer to include in the prompt |
| Persistence | Remembers last selected process, args, request, and files per workspace |

**Workflow:**
1. Select a process from the catalog
2. Configure parameters as needed
3. Enter your request text
4. Drag relevant files to include (optional)
5. Click **Dispatch** or press `Ctrl+Enter`

---

## Configuration

All settings are under the `babysitter` namespace.

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `babysitter.o.binaryPath` | string | `""` | Full path to `o` binary. If empty, looks in workspace root, then `PATH`. |
| `babysitter.oPath` | string | `""` | Legacy alias for `babysitter.o.binaryPath`. |
| `babysitter.runsRoot` | string | `.a5c/runs` | Runs root directory. Relative paths resolve from workspace root. |
| `babysitter.globalConfigPath` | string | `""` | Path to a JSON config file (supports `oBinaryPath`, `runsRoot`). |
| `babysitter.o.install.bashPath` | string | `""` | Windows only: Path to `bash.exe` for Git Bash fallback. |
| `babysitter.dispatch.shellPath` | string | `""` | macOS/Linux: Override shell executable for dispatch terminals. |
| `babysitter.dispatch.shellArgs` | string/array | `['-l']` | macOS/Linux: Extra shell arguments for dispatch terminals. |

### Example Configuration

**settings.json:**
```json
{
  "babysitter.runsRoot": ".a5c/runs",
  "babysitter.o.binaryPath": "./o"
}
```

**Global Config File** (point `babysitter.globalConfigPath` at this file):
```json
{
  "oBinaryPath": "C:/tools/o/o.exe",
  "runsRoot": ".a5c/runs"
}
```

---

## Keyboard Shortcuts

### Chorded Shortcuts

Press the first key combination, then the second key:

| First Combo | Second Key | Action |
|-------------|------------|--------|
| `Ctrl+Alt+B` | `P` | Open Prompt Builder |
| `Ctrl+Alt+B` | `N` | Dispatch Run |
| `Ctrl+Alt+B` | `R` | Resume Run |
| `Ctrl+Alt+B` | `D` | Open Run Details |
| `Ctrl+Alt+B` | `L` | Open Run Logs |
| `Ctrl+Alt+B` | `Shift+R` | Refresh Runs |
| `Ctrl+Alt+B` | `Enter` | Send Enter to `o` |
| `Ctrl+Alt+B` | `Esc` | Send ESC to `o` |

### Webview Shortcuts

**Prompt Builder:**

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Dispatch the prompt |
| `Ctrl+Shift+Enter` | Insert prompt into editor |
| `Ctrl+F` | Search the process catalog |
| `Ctrl+L` | Focus the request text area |

**Run Details (Awaiting Input):**

| Shortcut | Action |
|----------|--------|
| `Ctrl+R` | Refresh |
| `Ctrl+Enter` | Send response |
| `Enter` | Send Enter |
| `Esc` | Send ESC |
| `/` | Focus the input field |

**Run Logs:**

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Focus filter input |
| `Ctrl+L` | Clear active source |
| `Esc` | Clear filter |

---

## Commands Reference

| Title | Command ID |
|-------|------------|
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

---

## Troubleshooting

### Extension Cannot Find the `o` Binary

The extension resolves `o` in this order:
1. Workspace root (`<workspaceRoot>/o`)
2. `PATH` environment variable
3. `babysitter.o.binaryPath` setting

**Diagnosis:**
- Run `Babysitter: Locate \`o\` Binary` to see what is being resolved
- Run `Babysitter: Show Configuration Errors` to see validation output

**Common Fixes:**
- Ensure `o` exists at one of the expected locations
- If you modified `PATH`, fully restart VSCode (not just reload window)
- Explicitly set `babysitter.o.binaryPath` in settings

### Installing or Updating `o`

Run `Babysitter: Install/Update \`o\` in Workspace` to download and run the upstream installer.

**What It Does:**
- Creates/updates `<workspaceRoot>/o` and `<workspaceRoot>/.a5c/*`
- May edit `.gitignore` unless `--no-gitignore` is selected
- On Windows: Prefers WSL, falls back to Git Bash

**Security Note:** This command shows a consent prompt because it executes a downloaded script.

### Runs Not Appearing in Tree View

**Possible Causes:**
- Run folder doesn't match expected naming (`run-YYYYMMDD-HHMMSS`)
- `runsRoot` setting points to wrong location
- File watcher hasn't detected changes yet

**Solutions:**
- Click the **Refresh** button in the Runs view
- Verify `babysitter.runsRoot` setting
- Check that runs exist in `.a5c/runs/`

### Events Not Updating in Run Details

**Solutions:**
- Click **Refresh** in the webview
- Close and reopen Run Details
- Reattach to the run via `Babysitter: Resume Run`

### Windows-Specific Issues

| Issue | Solution |
|-------|----------|
| `./o` warns about missing `mktemp`/`bash` | Run inside WSL2 or configure Git Bash |
| Shell commands fail | Ensure `babysitter.o.install.bashPath` points to valid `bash.exe` |
| Path resolution issues | Use forward slashes or configure shell settings |

### Where to Find Logs

- **VSCode Output Panel**: View and Output and select `Babysitter` from the dropdown
- **Extension Host Logs**: Help and Toggle Developer Tools and Console tab
- **CI Test Logs**: Check workflow artifacts for `test-logs` and `vsix`

### Providing Debug Information

When reporting issues, include:
- Contents of `state.json`
- Contents of `journal.jsonl`
- Contents of `prompts/` directory
- Contents of `work_summaries/` directory
- VSCode Output panel logs for `Babysitter`

---

## Run Folder Structure

Understanding the event-sourced run model helps when debugging or reviewing runs.

```
.a5c/runs/<run_id>/
  inputs.json          # Structured goals/constraints
  code/main.js         # Process program (act/score/breakpoint flow)
  journal.jsonl        # Append-only events (function calls, breakpoints, notes)
  state.json           # Derived state pointer
  prompts/*.md         # Agent prompts per function call
  work_summaries/*.md  # Agent outputs per call
  artifacts/           # Run-specific deliverables (reports, JSON, docs)
```

---

## Quality Convergence Loop

The extension visualizes the quality convergence loop that runs follow:

1. **`act()`** - Produce work (code changes, notes, docs)
2. **`score()`** - Evaluate work against criteria; feedback stored in `work_summaries/`
3. **Loop** - If `reward_total` is below threshold, `act()` runs again with feedback
4. **`breakpoint()`** - Pause for human approval (plan review, scope change)

The Run Details webview highlights the current step and displays the latest score feedback.

---

## Related Documentation

- [Breakpoints](./breakpoints.md) - Human-in-the-loop approval system
- [Quality Convergence](./quality-convergence.md) - Iterative improvement workflows
- [Run Resumption](./run-resumption.md) - Continue interrupted workflows
- [Journal System](./journal-system.md) - Event-sourced audit trail
- [CLI Reference](../reference/cli-reference.md) - Command-line interface documentation

---

*Last updated: 2026-01-25*
