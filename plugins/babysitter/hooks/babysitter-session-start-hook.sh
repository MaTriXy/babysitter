#!/bin/bash
# Babysitter Session Start Hook - delegates to SDK CLI
exec babysitter hook:run --hook-type session-start --json < /dev/stdin
