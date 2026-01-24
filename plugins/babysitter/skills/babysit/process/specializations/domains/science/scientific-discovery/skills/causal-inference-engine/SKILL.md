---
name: causal-inference-engine
description: Causal reasoning with DAG construction and do-calculus
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
  backlog-id: SK-SD-007
  tools:
    - DoWhy
    - CausalNex
    - pgmpy
    - EconML
  processes:
    - causal-inference
    - causal-discovery
    - counterfactual-reasoning
---

# Causal Inference Engine Skill

## Purpose

Provides causal reasoning capabilities implementing DAG construction, do-calculus, and intervention effect estimation.

## Capabilities

- **DAG Construction**: Causal DAG construction and validation
- **Criterion Checking**: Backdoor/frontdoor criterion checking
- **Effect Estimation**: Average treatment effect estimation
- **IV Analysis**: Instrumental variable analysis
- **Mediation**: Mediation analysis
- **Sensitivity**: Sensitivity analysis for unmeasured confounding

## Usage Guidelines

1. **Model Building**
   - Identify variables
   - Specify causal structure
   - Validate assumptions

2. **Effect Estimation**
   - Choose identification strategy
   - Apply appropriate estimator
   - Quantify uncertainty

3. **Sensitivity Analysis**
   - Test robustness
   - Assess unmeasured confounding
   - Document limitations

4. **Best Practices**
   - Justify causal assumptions
   - Use multiple methods
   - Report sensitivity analyses
