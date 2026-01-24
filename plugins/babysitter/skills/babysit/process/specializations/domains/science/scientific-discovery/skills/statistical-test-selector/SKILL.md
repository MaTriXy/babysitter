---
name: statistical-test-selector
description: Automated statistical test selection
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
  category: statistical-analysis
  domain: scientific-discovery
  backlog-id: SK-SD-017
  tools:
    - scipy.stats
    - pingouin
    - statsmodels
  processes:
    - statistical-reasoning
    - hypothesis-formulation-testing
    - model-evaluation-validation
---

# Statistical Test Selector Skill

## Purpose

Provides automated statistical test selection capabilities based on data characteristics, research question, and assumption checking.

## Capabilities

- **Distribution Assessment**: Data distribution assessment
- **Assumption Testing**: Normality, homoscedasticity testing
- **Test Recommendation**: Test recommendation based on design
- **Alternatives**: Non-parametric alternative suggestions
- **Multiple Comparison**: Multiple comparison correction guidance
- **Effect Size**: Effect size calculator integration

## Usage Guidelines

1. **Data Assessment**
   - Check distribution
   - Test assumptions
   - Identify data structure

2. **Test Selection**
   - Match test to question
   - Consider alternatives
   - Plan for multiple comparisons

3. **Application**
   - Apply selected test
   - Compute effect sizes
   - Report appropriately

4. **Best Practices**
   - Document selection rationale
   - Report assumption checks
   - Use appropriate corrections
