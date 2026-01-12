# VS Code macOS dispatch mismatch

## Summary
- Expected: invoking `Babysitter: Dispatch new run via o` should surface the same managed VS Code terminal session on macOS that Windows users get (named `o (dispatch)`) so the user can answer prompts, send ESC/ENTER, and monitor output.
- Actual: on macOS the command falls through to `dispatchNewRunViaO` which spawns `o` via `node-pty` inside the extension host (no `vscode.Terminal` UI), so the session runs headlessly and the user never sees or can control it.

## Environment
- Platform: macOS (Darwin) - run `run-20260112-112131`
- VS Code extension: `src/extension.ts`
- Dispatch backend: `src/core/oDispatch.ts`

## Reproduction steps
1. macOS user with `o` installed in the workspace opens VS Code and loads the Babysitter extension (`src/extension.ts` entry point).
2. Run the `Babysitter: Dispatch new run via o` command (or click the command palette entry) and enter a prompt.
3. Observe that the Babysitter output channel logs `Dispatching via o: ...` and `Started interactive o process (pid ...)` (generated at `src/extension.ts:362-458`) but no VS Code terminal tab appears.
4. Inspect Activity Bar -> Runs tree: a run directory eventually appears once `o` finishes, but the user never interacted with the terminal session.

## Observed behavior
- `dispatchRun` hits the Windows-only branch that opens Git Bash (`openGitBashTerminalAndSend`) only when `process.platform === 'win32'` (`src/extension.ts:365-433`).
- For macOS, execution falls through to `dispatchNewRunViaO` (`src/core/oDispatch.ts:238-404`), which uses `spawnPtyProcess`/`node-pty` to launch `o` as a background PTY tied to the extension host. That PTY is invisible to the user, so prompts and confirmations cannot be answered.
- Babysitter output channel shows the PID log but no UI is spawned; the run completes only if `o` does not need user input.

## Expected behavior
- Non-Windows platforms should also open a managed VS Code terminal (e.g., via `vscode.window.createTerminal`) so users can watch and control `o` just like Windows users do via Git Bash, with the extension still polling `runsRoot` for new runs.

## Impact
- macOS users cannot acknowledge `o` prompts, send ESC/ENTER, or recover from failures mid-run because the process is hidden. This blocks dispatching runs that require interactive confirmation, making the extension unusable for many workflows on macOS.

## Supporting details
- Logs: Babysitter output channel lines `Dispatching via o: ...` and `Started interactive o process (pid ...)` come from `src/extension.ts:362-458`; no corresponding `vscode.window.createTerminal` call is made outside the Windows block `src/extension.ts:365-433`.
- Code path reference: `dispatchNewRunViaO` (`src/core/oDispatch.ts:238-404`) immediately spawns `spawnPtyProcess` without ever binding it to a VS Code terminal, confirming that macOS executions are headless.

## Root-cause hypotheses
1. **Windows-only guard bypasses any VS Code terminal creation on macOS** (`src/extension.ts:365-433`)  
   - Confirm: Instrument the `if (process.platform === 'win32')` block in `src/extension.ts:365-433` to show it never executes on mac, proving `openGitBashTerminalAndSend` is the only place dispatch calls `vscode.window.createTerminal`.  
   - Disconfirm: Find (or add) a mac path within `dispatchRun`/`dispatchNewRunViaO` (`src/extension.ts:352-458`) that still invokes `vscode.window.createTerminal` despite `process.platform !== 'win32'`.
2. **dispatchNewRunViaO keeps the PTY headless so it can capture stdout/stderr** (`src/core/oDispatch.ts:238-404`, `src/extension.ts:430-458`)  
   - Confirm: Trace the call chain from `dispatchRun` into `dispatchNewRunViaO` and `spawnPtyProcess` (`src/core/oDispatch.ts:238-404`) to show the PTY only registers with `registerOProcess`, never `vscode.Terminal`, while logs from `src/extension.ts:430-458` emit `Started interactive o process`.  
   - Disconfirm: Demonstrate a code path in `src/core/oDispatch.ts` that forwards the PTY to `vscode.window.createTerminal` or otherwise mirrors stdout/stderr into an integrated terminal tab.
3. **Terminal helper is hard-coded to Git Bash semantics** (`src/extension.ts:189-223`, `src/extension.ts:365-420`)  
   - Confirm: Review `openGitBashTerminalAndSend` and `resolveWindowsInvocationOptions` (`src/extension.ts:189-223`) to show they inject Git Bash / `cygpath` commands before dispatch (`src/extension.ts:365-420`), making the helper unusable on mac/Linux.  
   - Disconfirm: Identify and reference any platform-agnostic helper (e.g., accepting `/bin/zsh`) wired into `dispatchRun` outside the Windows guard; none are evident in `src/extension.ts`.
4. **Captured stdout parsing drives run-id detection, making detached terminals risky** (`src/core/oDispatch.ts:88-167`, `src/core/oDispatch.ts:238-330`)  
   - Confirm: Show that `parseDispatchedRunInfo` (`src/core/oDispatch.ts:88-167`) and the follow-up polling in `dispatchNewRunViaO` (`src/core/oDispatch.ts:238-330`) rely on PTY ownership to read the `run-YYYYMMDD-HHMMSS` token promptly, motivating the headless design.  
   - Disconfirm: Produce mac logs proving `o` prints the run id synchronously so `waitForNewRunId` could rely solely on filesystem polling without intercepting stdout.
5. **No macOS shell path/config exists to recreate the Git Bash experience** (`package.json:221-244`, `README.md:32-34`, `src/extension.ts:170-223`)  
   - Confirm: Cite `package.json` contribution points (`package.json:221-244`) and docs (`README.md:32-34`) showing only the Windows-specific `babysitter.o.install.bashPath`, while `src/extension.ts:170-223` reads it exclusively under the Windows guard.  
   - Disconfirm: Surface a mac-specific setting (e.g., `babysitter.dispatch.shellPath`) and show where `src/extension.ts` consumes it to create a VS Code terminal.

## Diagnosis (2026-01-12)
- The only place we ever call `vscode.window.createTerminal` during dispatch is inside the Windows-only Git Bash branch (`src/extension.ts:365-433`). On macOS the guard fails, so `dispatchRun` immediately falls through to `dispatchNewRunViaO`.
- `dispatchNewRunViaO` (`src/core/oDispatch.ts:238-404`) starts `o` via `node-pty`, registers the PTY with `registerOProcess`, and parses stdout for the run id; it never surfaces a `vscode.Terminal`, so the session stays headless.
- There is no mac- or Linux-specific shell configuration (`package.json` only exposes `babysitter.o.install.bashPath` for Windows installers), so macOS has no way to ask for an interactive shell.
- Therefore the most plausible root cause is the missing non-Windows terminal path: the Windows guard encapsulates the only integrated-terminal workflow, and all other platforms are forced into the headless PTY dispatcher.

## Required code changes
1. **Add a POSIX terminal helper in `src/extension.ts`.** Next to `openGitBashTerminalAndSend`, create `openPosixTerminalAndSend({ name, workspaceRoot, command, shellPath? })` that calls `vscode.window.createTerminal` with the workspace `cwd`, optional `shellPath`, and sends the composed `bashSingleQuote` command (`cd ...; "<o>" '<prompt>'`). Default the shell to `process.env.SHELL ?? '/bin/bash'`.
2. **Branch for mac/Linux before `dispatchNewRunViaO`.** In `dispatchRun`, after computing `windowsInvocation`, detect `process.platform !== 'win32'` (or Windows + native binary) and run the same flow the Windows Git Bash branch uses: snapshot `baselineIds = new Set(listRunIds(...))`, call the new helper to launch the terminal, then reuse `waitForNewRunId` to resolve `{ runId, runRootPath }`. This restores visibility without touching the headless path.
3. **Allow shell overrides.** Add `babysitter.dispatch.shellPath` (and optional `shellArgs`) to `package.json` contributions and plumb it through settings so mac/Linux users can force `/bin/zsh`, `nix-shell`, etc. Read it alongside the existing bashPath logic and pass it into the helper.
4. **Wire run-id + ESC/ENTER interactions.** After `waitForNewRunId` returns, call `interactions.setLabelForPid` once `terminal.processId` resolves so ESC/ENTER features can target the interactive terminal. If VS Code denies `processId`, warn in the output channel.
5. **Docs + telemetry.** Document the new setting in `README.md` and add a log/telemetry line in `dispatchRun` that prints which terminal path was chosen so we can confirm mac users hit the new branch.

## Risks, mitigations, and evidence to gather next
- **Run-id detection now depends on filesystem polling only.** Because we no longer intercept stdout, the dispatcher should bump `waitForNewRunId`'s timeout (currently 120s) or surface progress notifications so mac users know we are waiting. Gather mac timing data by logging `waitForNewRunId` duration before shipping.
- **ESC/ENTER automation relies on knowing the terminal PID.** Verify `vscode.Terminal.processId` resolves on macOS after launching via `createTerminal`; if it does not, interactions may stay headless. Consider falling back to `registerOProcess` only when we successfully read the PID.
- **Shell diversity.** macOS defaults to `zsh` but many developers use fish or custom shells. Capture `process.env.SHELL` during activation (or rely on the new setting) so we do not assume `/bin/bash`. Test with prompts containing quotes/emoji to ensure the quoting helper still works.
- **Evidence still needed.** Capture VS Code logs showing `process.platform` on mac hitting the non-Windows branch and confirm `dispatchNewRunViaO`'s `Started interactive o process` log is the last thing printed today—proves we never create a terminal. Also gather an `o` transcript to confirm run-id text appears before the run directory is created, informing whether we should keep stdio parsing for future enhancements.

## Fix status (2026-01-12)
- POSIX terminal dispatch is implemented in `src/extension.ts:203-520`, so macOS/Linux now launch `o` inside a VS Code terminal, wait for run directories to appear, and map the terminal pid back to the interaction tracker.
- Users can configure the shell via `babysitter.dispatch.shellPath` / `babysitter.dispatch.shellArgs`; defaults fall back to `$SHELL` or `/bin/bash` with `-l`.
