---
description: Set up babysitting locally for yourself. This will guide you through the onboarding process for babysitter, including installing the proper plugins, skills, agents, processes, and tools for your user. as well as optionally integrating with your existing external tools and services (communication, browser, ticketing, life events monitoring and logging, health, etc). This will also create the initial user profile, configuration and dependencies for babysitting runs.
argument-hint: Specific instructions for the run.
allowed-tools: Read, Grep, Write, Task, Bash, Edit, Grep, Glob, WebFetch, WebSearch, Search, AskUserQuestion, TodoWrite, TodoRead, BashOutput, Skill, KillShell, MultiEdit, LS
---
Invoke the babysitter:babysit skill (using the Skill tool) and follow its instructions (SKILL.md).

use the user-install process from the process-library under skills/babysit/process/cradle to set up and customize babysitter for the user, environment, and needs.
it should cover:
- installing the babysitter sdk and dependencies (jq)
- interviewing the user about their specialties, experience, expertise levels, goals, preferences, and needs regarding babysitting and their work and life in general. then researching and setting up a "user profile" that will be used to personalize and customize babysitting runs for the user. (use can even post linkenin profile or other social profiles, then we should research the user)
. this profile should be continuously updated and improved based on the user's feedback, needs, and changing circumstances.
- setting up the best tools, agents, processes, and skills for the user based on their profile and needs
- setting up the user profile and configuration
- make sure it can run twice (read the exiting profile and config before starting and overwriting)


when implementing this skill, the babysit skill should be modified to read the user profile files to understand the user, during process building and understand when to put breakpoints in processes (according to the user expertiese level)