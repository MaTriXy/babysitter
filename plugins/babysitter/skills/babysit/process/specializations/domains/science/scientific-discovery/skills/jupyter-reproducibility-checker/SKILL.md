---
name: jupyter-reproducibility-checker
description: Notebook reproducibility validation
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
metadata:
  version: "1.0"
  category: reproducibility-documentation
  domain: scientific-discovery
  backlog-id: SK-SD-024
  tools:
    - nbQA
    - papermill
    - pipreqs
    - nbstripout
  processes:
    - reproducible-research-pipeline
    - exploratory-data-analysis
---

# Jupyter Reproducibility Checker Skill

## Purpose

Provides notebook reproducibility validation capabilities for dependency tracking, execution order verification, and environment capture.

## Capabilities

- **Execution Order**: Cell execution order validation
- **Hidden State**: Hidden state detection
- **Dependencies**: Dependency extraction (pipreqs)
- **Environment**: Environment capture (pip freeze, conda)
- **Linting**: Notebook linting
- **Scoring**: Reproducibility scoring

## Usage Guidelines

1. **Validation**
   - Check execution order
   - Detect hidden state
   - Extract dependencies

2. **Environment**
   - Capture environment
   - Pin versions
   - Document requirements

3. **Cleanup**
   - Strip outputs
   - Lint notebook
   - Score reproducibility

4. **Best Practices**
   - Run fresh kernel tests
   - Use requirements files
   - Document data sources
