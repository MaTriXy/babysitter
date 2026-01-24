---
name: meta-analysis-engine
description: Meta-analysis for effect size pooling
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
  backlog-id: SK-SD-018
  tools:
    - metafor (R via rpy2)
    - PythonMeta
    - forestplot
  processes:
    - literature-review-synthesis
    - triangulation
    - evidence-synthesis
---

# Meta-Analysis Engine Skill

## Purpose

Provides meta-analysis capabilities for effect size pooling, heterogeneity assessment, and publication bias detection.

## Capabilities

- **Effect Pooling**: Fixed/random effects meta-analysis
- **Heterogeneity**: Heterogeneity metrics (I-squared, tau-squared)
- **Funnel Plots**: Funnel plot generation
- **Trim and Fill**: Trim-and-fill analysis
- **Subgroup Analysis**: Subgroup analysis
- **Meta-Regression**: Meta-regression

## Usage Guidelines

1. **Data Preparation**
   - Extract effect sizes
   - Standardize metrics
   - Code study characteristics

2. **Analysis**
   - Choose model type
   - Assess heterogeneity
   - Check publication bias

3. **Reporting**
   - Generate forest plots
   - Report heterogeneity
   - Document sensitivity analyses

4. **Best Practices**
   - Pre-specify analyses
   - Explore heterogeneity
   - Report all results
