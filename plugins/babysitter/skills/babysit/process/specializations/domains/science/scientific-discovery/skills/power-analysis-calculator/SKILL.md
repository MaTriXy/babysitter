---
name: power-analysis-calculator
description: Statistical power analysis and sample size determination
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
  backlog-id: SK-SD-013
  tools:
    - statsmodels
    - pingouin
    - GPower (via API)
  processes:
    - experimental-design-controls
    - hypothesis-formulation-testing
    - ab-testing-framework
---

# Power Analysis Calculator Skill

## Purpose

Provides statistical power analysis capabilities for sample size determination, effect size estimation, and sensitivity analysis.

## Capabilities

- **A Priori Power**: A priori power analysis
- **Post Hoc Power**: Post-hoc power calculation
- **Sensitivity Analysis**: Effect size sensitivity analysis
- **Multiple Comparisons**: Multiple comparison adjustment
- **Complex Designs**: Power for factorial, repeated measures
- **Visualization**: Power curve visualization

## Usage Guidelines

1. **Planning Phase**
   - Specify effect size
   - Set alpha and power targets
   - Account for design complexity

2. **Calculation**
   - Choose appropriate test
   - Input parameters
   - Compute sample size

3. **Interpretation**
   - Assess feasibility
   - Consider alternatives
   - Document decisions

4. **Best Practices**
   - Use realistic effect sizes
   - Plan for attrition
   - Pre-register power analysis
