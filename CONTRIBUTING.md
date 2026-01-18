# Contributing to Babysitter

Thanks for helping improve Babysitter.

## Prerequisites

- VS Code `^1.90.0`
- Node.js 20+
- npm

## Setup

```bash
npm ci
```

## Common tasks

```bash
npm run lint
npm run format
npm run format:check

npm run build
npm run watch

npm test
npm run test:ci

npm run package
```

## Debugging (Extension Development Host)

1. Open this repo in VS Code.
2. Press `F5` to start an **Extension Development Host**.
3. In the Dev Host window, open a workspace (folder) you want to test against.
4. Use the Command Palette to run:
   - `Babysitter: Activate (Log Output)` (handy for confirming activation + Output channel)
   - `Babysitter: Refresh Runs`
   - `Babysitter: Open Run Details`
   - `Babysitter: Open Run Logs`

For a predictable demo workspace, use `packages/vscode-extension/src/test/fixtures/workspace` in the Dev Host. See `DEMO.md`.

## Where to find logs / diagnostics

- VS Code **View → Output** → select `Babysitter`
- If the issue is run-specific, include:
  - the run folder path under `.a5c/runs/run-*`
  - `state.json` and `journal.jsonl` (redact secrets)
- Helpful command:
  - `Babysitter: Show Configuration Errors`

## PR checklist

- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] Tests: `npm test` (and `npm run test:ci` when relevant)
- [ ] Docs updated if you changed commands/settings/UX (`README.md`, `DEMO.md`, etc.)
- [ ] `CHANGELOG.md` updated when user-facing behavior changes

