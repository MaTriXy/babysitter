---
description: manage babysitter plugins. use this command to see the list of installed babysitter plugins, their status, and manage them (install, update, uninstall, list from marketplace, add marketplace, etc).
argument-hint: Specific instructions for the run.
allowed-tools: Read, Grep, Write, Task, Bash, Edit, Grep, Glob, WebFetch, WebSearch, Search, AskUserQuestion, TodoWrite, TodoRead, BashOutput, Skill, KillShell, MultiEdit, LS
---

implementation notes: install https://github.com/YoavMayer/babysitter-observer-dashboard, configure and run

the watchdir is usually the project container dir, probably the parent of the project dir.

npx -y @yoavmayer/babysitter-observer-dashboard@latest --watch-dir .
(blocking request)

then open the browser with the returned url

