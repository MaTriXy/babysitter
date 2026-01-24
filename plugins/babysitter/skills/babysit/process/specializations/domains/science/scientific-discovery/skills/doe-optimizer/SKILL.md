---
name: doe-optimizer
description: Design of Experiments optimization
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
  category: experimental-design
  domain: scientific-discovery
  backlog-id: SK-SD-016
  tools:
    - pyDOE2
    - statsmodels
    - scipy.optimize
  processes:
    - experimental-design-controls
    - fermi-order-magnitude
    - limiting-case-reasoning
---

# DOE Optimizer Skill

## Purpose

Provides Design of Experiments optimization capabilities for factorial design, response surface methodology, and optimal design selection.

## Capabilities

- **Factorial Design**: Full/fractional factorial design
- **RSM**: Response surface methodology
- **Optimal Design**: D-optimal/I-optimal design generation
- **Taguchi Arrays**: Taguchi orthogonal arrays
- **Design Metrics**: Design evaluation metrics
- **Confounding**: Confounding structure analysis

## Usage Guidelines

1. **Design Selection**
   - Identify factors and levels
   - Choose design type
   - Consider resource constraints

2. **Optimization**
   - Generate optimal design
   - Evaluate design metrics
   - Analyze confounding

3. **Implementation**
   - Create run order
   - Plan blocking
   - Document design

4. **Best Practices**
   - Consider replication
   - Plan for center points
   - Account for nuisance factors
