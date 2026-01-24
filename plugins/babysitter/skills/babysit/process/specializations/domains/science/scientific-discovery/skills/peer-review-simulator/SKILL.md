---
name: peer-review-simulator
description: Pre-submission review simulation
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
  category: peer-review-validation
  domain: scientific-discovery
  backlog-id: SK-SD-031
  tools:
    - LLM chains
    - custom rubrics
  processes:
    - adversarial-co-design
    - premortem-red-team
    - key-assumptions-check
---

# Peer Review Simulator Skill

## Purpose

Provides pre-submission review simulation capabilities for methodology critique, statistical review, and clarity assessment.

## Capabilities

- **Methodology Critique**: Methodology critique generation
- **Statistical Review**: Statistical analysis review
- **Clarity Assessment**: Clarity and readability assessment
- **Concern Identification**: Common reviewer concern identification
- **Strength/Limitation**: Strength/limitation analysis
- **Revision Suggestions**: Revision suggestion generation

## Usage Guidelines

1. **Review Setup**
   - Define review scope
   - Select rubrics
   - Configure reviewers

2. **Simulation**
   - Generate critiques
   - Identify concerns
   - Assess strengths/limitations

3. **Revision**
   - Address critiques
   - Improve clarity
   - Strengthen arguments

4. **Best Practices**
   - Review before submission
   - Address all concerns
   - Document responses
