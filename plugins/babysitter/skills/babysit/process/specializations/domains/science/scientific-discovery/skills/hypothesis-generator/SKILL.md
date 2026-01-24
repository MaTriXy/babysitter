---
name: hypothesis-generator
description: Automated hypothesis generation using abductive reasoning
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
  category: hypothesis-reasoning
  domain: scientific-discovery
  backlog-id: SK-SD-006
  tools:
    - Knowledge graphs
    - LLM chains
    - symbolic reasoners
  processes:
    - hypothesis-formulation-testing
    - abductive-reasoning
    - multiple-working-hypotheses
---

# Hypothesis Generator Skill

## Purpose

Provides automated hypothesis generation capabilities using abductive reasoning, analogy detection, and knowledge graph traversal.

## Capabilities

- **Pattern Generation**: Pattern-based hypothesis generation
- **Analogy Detection**: Cross-domain analogy detection
- **Contradiction Finding**: Contradiction identification
- **Ranking**: Hypothesis ranking by novelty/parsimony
- **Null Hypothesis**: Null hypothesis formulation
- **Falsifiability**: Falsifiability assessment

## Usage Guidelines

1. **Generation Process**
   - Gather relevant observations
   - Apply reasoning patterns
   - Generate candidate hypotheses

2. **Evaluation**
   - Assess falsifiability
   - Check novelty
   - Evaluate parsimony

3. **Refinement**
   - Identify contradictions
   - Refine based on evidence
   - Prioritize hypotheses

4. **Best Practices**
   - Generate multiple hypotheses
   - Document reasoning
   - Test assumptions
