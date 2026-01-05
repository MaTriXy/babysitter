# Security & Privacy

## Data access

Babysitter is a VS Code extension that operates on your local workspace. It may read and write:

- `.a5c/**` (runs, state, journals, artifacts, prompts, work summaries)
- workspace files you explicitly include in prompts (via the Prompt Builder)

## Network access

Babysitter does not require network access for normal run monitoring and UI features.

If you use **`Babysitter: Install/Update \`o\` in Workspace`**, the extension downloads and executes the upstream `o` installer (commonly `curl | bash`). This action is user-initiated and gated by an explicit consent prompt because it executes a downloaded script.

## Telemetry

Babysitter does not intentionally collect or transmit telemetry.

## Reporting a vulnerability

If you believe you’ve found a security vulnerability, please report it privately via GitHub Security Advisories (Security tab), if available for this repository. If that is not available, open an issue with minimal details and request a private contact channel.

