---
name: regression-analyzer
description: Comprehensive regression analysis
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
  backlog-id: SK-SD-019
  tools:
    - statsmodels
    - scikit-learn
    - linearmodels
  processes:
    - statistical-reasoning
    - causal-inference-observational
    - bias-variance-tradeoff
---

# Regression Analyzer Skill

## Purpose

Provides comprehensive regression analysis capabilities for model fitting, diagnostics, and interpretation support.

## Capabilities

- **Model Types**: Linear/logistic/Poisson regression
- **Mixed Effects**: Mixed effects models
- **Diagnostics**: Assumption diagnostics
- **VIF**: Multicollinearity detection
- **Residuals**: Residual analysis
- **Interpretation**: Coefficient interpretation support

## Usage Guidelines

1. **Model Building**
   - Select appropriate model type
   - Include relevant predictors
   - Consider interactions

2. **Diagnostics**
   - Check assumptions
   - Examine residuals
   - Detect multicollinearity

3. **Interpretation**
   - Interpret coefficients
   - Report confidence intervals
   - Discuss limitations

4. **Best Practices**
   - Check all assumptions
   - Report full results
   - Consider alternatives
