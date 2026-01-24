---
name: network-visualizer
description: Network and graph visualization
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
  category: data-visualization
  domain: scientific-discovery
  backlog-id: SK-SD-022
  tools:
    - NetworkX
    - pyvis
    - Gephi (via API)
    - D3.js
  processes:
    - network-pathway-reasoning
    - systems-thinking
    - literature-review
---

# Network Visualizer Skill

## Purpose

Provides network and graph visualization capabilities for citation networks, causal diagrams, and system maps.

## Capabilities

- **Force-Directed**: Force-directed layouts
- **Hierarchical**: Hierarchical layouts
- **Community Detection**: Community detection visualization
- **Interactive**: Interactive exploration
- **Edge Bundling**: Edge bundling for large networks
- **Temporal**: Temporal network animation

## Usage Guidelines

1. **Layout Selection**
   - Choose appropriate layout
   - Consider network size
   - Plan interactivity

2. **Visualization**
   - Apply visual encodings
   - Highlight communities
   - Add labels appropriately

3. **Export**
   - Export static images
   - Create interactive versions
   - Document network metrics

4. **Best Practices**
   - Reduce visual clutter
   - Use meaningful colors
   - Provide context
