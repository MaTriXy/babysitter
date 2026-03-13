# babysitter-pi

Babysitter SDK deep integration plugin for oh-my-pi.

This plugin makes babysitter a mandatory first-class orchestration layer within oh-my-pi, providing:

- **Session auto-binding** -- automatically binds pi sessions to babysitter runs
- **Task interception** -- intercepts pi task dispatch and routes through babysitter's effect system
- **TUI widgets** -- provides terminal UI components for babysitter run status and task progress
- **Harness adapter** -- adapts babysitter's test harness for pi's execution environment

## Installation

```bash
omp install babysitter-pi
```

## Structure

- `extensions/babysitter/` -- oh-my-pi extension hooks for babysitter integration
- `tools/` -- tool definitions exposed to the pi agent
- `skills/babysitter/` -- skill definitions for babysitter orchestration
- `commands/` -- CLI commands registered with oh-my-pi
- `scripts/` -- postinstall/preuninstall lifecycle scripts
- `test/` -- integration, harness, and TUI tests
- `docs/` -- additional documentation

## License

MIT
