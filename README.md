# babysitter ide

Babysitter is a VS Code extension for orchestrating and monitoring `o` runs.

## Install

This repository is the extension source. To install a built VSIX:

- Build and package: `npm install && npm run package`
- Install the VSIX:
  - VS Code: Extensions view → `...` → **Install from VSIX...**
  - Or: `code --install-extension babysitter-*.vsix`

## Develop

- Install deps: `npm install`
- Build once: `npm run build`
- Watch (recommended while iterating): `npm run watch`
- Lint/format: `npm run lint` / `npm run format`
- Tests:
  - All: `npm test`
  - Headless (CI-friendly): `npm run test:ci`

## Run (extension)

- Open this repo in VS Code
- Start the extension host: press `F5`
- Command Palette:
  - `Babysitter: Activate (Log Output)`
  - `Babysitter: Dispatch Run`
  - `Babysitter: Resume Run`
  - `Babysitter: Send ESC to \`o\``
  - `Babysitter: Send Enter to \`o\``
  - `Babysitter: Locate \`o\` Binary`
  - `Babysitter: Show Configuration Errors`
  - `Babysitter: Open Run Details`
  - `Babysitter: Reveal Run Folder in Explorer`

## Runs View

Babysitter adds a **Babysitter Runs** TreeView in the Explorer sidebar showing discovered runs and their current status.

- Click a run (or run `Babysitter: Open Run Details`) to open a Run Details webview with:
  - Key run metadata + current `state.json`
  - Latest `journal.jsonl` events
  - Work summaries (`run/work_summaries/`) with preview + open-in-editor
  - Artifacts browser (`run/artifacts/`) with reveal + open-in-editor
- Right-click a run to reveal its run folder in Explorer/Finder.

## Flows

Babysitter is designed around these primary user flows (per `requirements.md`):

### Dispatch

- Create a new run by dispatching an `o` request.
- Use `Babysitter: Dispatch Run` to invoke `o` with your request prompt.
- Attach files/links from the workspace when crafting a prompt (drag/drop).

### Monitor

- Follow a run by inspecting its run directory, including `journal.jsonl`, `state.json`, and artifacts under `run/artifacts/`.
- Run views auto-refresh on changes to `state.json`, `journal.jsonl`, and `run/artifacts/**` (debounced).
- Parsers are resilient to partial writes (e.g. `journal.jsonl` line currently being written).
- Runs are discovered by scanning the runs root (default `.a5c/runs`) for directories named like `run-YYYYMMDD-HHMMSS`.
- View task stdout and work summaries as the run progresses.

### Resume

- Resume an existing run by re-dispatching using the run id and the updated request/prompt.
- Use `Babysitter: Resume Run` to select a run and enter an updated request, then Babysitter invokes `o` with `[runId, prompt]`.
- Continue monitoring from the same run directory and journal stream.

### Pause

- When `o` is awaiting input (breakpoints/prompts), use:
  - `Babysitter: Send ESC to \`o\``
  - `Babysitter: Send Enter to \`o\``
- Respond to breakpoints/prompts when `o` requests user feedback or steering.

Note: Babysitter runs `o` under a pseudo-terminal so interactive key presses work reliably. Output is captured as a single stream (stdout/stderr are not separated when attached to a PTY).

## Troubleshooting

### Babysitter can't find the `o` binary

Babysitter expects `o` to be either:

- In the workspace root (this repo includes an `o` binary at `./o`), or
- Available on `PATH`, or
- Configured explicitly via VS Code setting `babysitter.o.binaryPath` (or legacy `babysitter.oPath`)

Use `Babysitter: Locate \`o\` Binary` to see what Babysitter is resolving and where it was found.

If you recently changed `PATH`, fully restart VS Code so the extension host picks up the updated environment.

### Configuration validation

Babysitter validates its configuration on activation and shows a status bar indicator when something is wrong.

- View details: `Babysitter: Show Configuration Errors`
- Settings:
  - `babysitter.o.binaryPath`: path to the `o` executable (or a directory containing it)
  - `babysitter.runsRoot`: runs root (default `.a5c/runs`, relative to the workspace root)
  - `babysitter.globalConfigPath`: optional JSON config file with keys `oBinaryPath` and `runsRoot`
