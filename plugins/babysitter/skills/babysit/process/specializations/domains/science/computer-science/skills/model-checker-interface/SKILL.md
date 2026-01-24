---
name: model-checker-interface
description: Interface with multiple model checking tools including SPIN, NuSMV, and UPPAAL
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
metadata:
  specialization: computer-science
  domain: science
  category: formal-verification
  phase: 6
---

# Model Checker Interface

## Purpose

Provides expert guidance on using model checking tools for system verification.

## Capabilities

- SPIN/Promela specification generation
- NuSMV/NuXMV interface
- UPPAAL for timed systems
- Result parsing and visualization
- Counterexample trace analysis
- State space reduction techniques

## Usage Guidelines

1. **Model Selection**: Choose appropriate tool
2. **Specification Writing**: Create model
3. **Property Specification**: Define temporal properties
4. **Model Checking**: Execute verification
5. **Analysis**: Interpret results

## Dependencies

- SPIN, NuSMV, UPPAAL
- Visualization tools

## Process Integration

- Model Checking Verification
- Distributed Consensus Protocol Design workflows
