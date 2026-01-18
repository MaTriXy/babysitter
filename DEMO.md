# Babysitter Demo (Fixture Workspace)

This repo includes a small, pre-seeded demo workspace at `packages/vscode-extension/src/test/fixtures/workspace` so you can exercise the UI without dispatching a real `o` run.

## What’s pre-seeded

The fixture workspace contains a minimal runs root at `packages/vscode-extension/src/test/fixtures/workspace/.a5c/runs`:

- `run-20990101-000000/`
  - `state.json` with `"status": "running"`
  - `journal.jsonl` with a few events (so Run Details / Run Logs have something to render)

## One-time setup

From the repo root:

```bash
npm ci
```

## Launch the Extension Development Host

1. Open this repo in VS Code.
2. Press `F5` to start an **Extension Development Host**.

## Open the fixture workspace (in the Dev Host)

In the **Extension Development Host** window:

1. **File → Open Folder…**
2. Select `packages/vscode-extension/src/test/fixtures/workspace`.

## Verify key flows

### 1) Activate + Output channel

- Command Palette: `Babysitter: Activate (Log Output)`
- Output panel: **View → Output** → select `Babysitter`

### 2) Runs view checkpoint

1. Explorer sidebar → **Babysitter Runs**
2. Expected: `run-20990101-000000` appears.

If it doesn’t:

- Run: `Babysitter: Refresh Runs`
- Confirm the opened folder is `packages/vscode-extension/src/test/fixtures/workspace` and contains `.a5c/runs`.

### 3) Run Details checkpoint

1. Select `run-20990101-000000` in **Babysitter Runs**.
2. Open: `Babysitter: Open Run Details`
3. Expected: status `running` and a journal tail rendered.

### 4) Run Logs checkpoint

1. With the run selected, open: `Babysitter: Open Run Logs`
2. Expected: log content includes the `journal.jsonl` tail.

