---
name: connected-papers-mapper
description: Citation graph exploration for related work discovery
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
  category: literature-knowledge
  domain: scientific-discovery
  backlog-id: SK-SD-003
  tools:
    - Connected Papers API
    - NetworkX
    - pyvis
  processes:
    - literature-review-synthesis
    - exploratory-cycle
    - gap-identification
---

# Connected Papers Mapper Skill

## Purpose

Provides citation graph exploration capabilities for discovering related work through visual graph traversal and temporal evolution analysis.

## Capabilities

- **Graph Generation**: Citation graph generation
- **Seminal Papers**: Seminal paper identification
- **Research Fronts**: Research front detection
- **Temporal Analysis**: Temporal citation analysis
- **Field Bridges**: Field bridge identification
- **Export**: Export to reference managers

## Usage Guidelines

1. **Graph Exploration**
   - Start with key papers
   - Explore citation clusters
   - Identify research fronts

2. **Temporal Analysis**
   - Track field evolution
   - Find seminal works
   - Identify emerging topics

3. **Gap Discovery**
   - Find under-connected areas
   - Identify bridge opportunities
   - Discover novel connections

4. **Best Practices**
   - Validate key papers
   - Explore multiple seeds
   - Document exploration paths
