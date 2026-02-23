---
description: Set up a project for babysitting. This will guide you through the onboarding process for a new or existing project. including installing the proper skills, agents, processes, and tools for your project. as well as optionally configuring the babysitter to run in the CI/CD pipeline and integrate with your existing external tools and services (ticketing, monitoring, logging, tracking, etc).
argument-hint: Specific instructions for the run.
allowed-tools: Read, Grep, Write, Task, Bash, Edit, Grep, Glob, WebFetch, WebSearch, Search, AskUserQuestion, TodoWrite, TodoRead, BashOutput, Skill, KillShell, MultiEdit, LS
---

Invoke the babysitter:babysit skill (using the Skill tool) and follow its instructions (SKILL.md). 

use the project-install process from the process-library (from skills/babysit/process/cradle) to set up and customize babysitter for the project, environment, and needs.

it should cover:
- researching the existing project (repo or repos) and its code, documentation, tools, services, workflows, processes, and practices to understand the project and its needs for babysitting. run process mining on the history of the project to understand its existing rules, processes, policies, evolution, patterns, and bottlenecks. interview the user  to understand their needs, pain points, and goals regarding babysitting and their work in general.
- researching and setting up a "project profile" that will be used to personalize and customize babysitting runs for the project. this profile should include the project's description, goals, tech stack, architecture, team members, roles, responsibilities, workflows, processes, tools, services, external integrations, and other relevant information about the project. this profile should be continuously updated and improved based on the project's feedback, needs, and changing circumstances.
- installing the best skills, agents, processes, and tools for the project based on its profile and needs
- setting up the project profile and configuration
- optionally setting up the babysitter to run in the CI/CD pipeline and integrate with the existing external tools and services (ticketing, monitoring, logging, tracking, etc) used for the project
- add processes and other instructions for CLAUDE.md
- make sure it can run twice

for new projects (if the project is empty or only has initial definitions):
- scaffold the project using the gsd/new-project process patterns: vision capture, domain research (stack, features, architecture, pitfalls), requirements scoping (v1/v2 separation), and roadmap creation with phased milestones
- initialize the .a5c directory structure with package.json and babysitter-sdk dependency
- create an initial CLAUDE.md with project-specific instructions, commands, and conventions
- set up basic project structure based on the chosen tech stack and architecture pattern
- install foundational skills, agents, and processes appropriate for the project type
- configure initial quality gates and testing infrastructure
- the new project scaffolding phase should include breakpoints for vision review, requirements review, and roadmap approval before proceeding