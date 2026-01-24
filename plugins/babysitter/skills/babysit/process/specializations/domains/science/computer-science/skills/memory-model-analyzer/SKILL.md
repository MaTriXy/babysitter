---
name: memory-model-analyzer
description: Analyze programs under various memory models including sequential consistency and TSO
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
  category: concurrency
  phase: 6
---

# Memory Model Analyzer

## Purpose

Provides expert guidance on analyzing concurrent programs under different memory models.

## Capabilities

- Sequential consistency checking
- Total Store Order (TSO) analysis
- C/C++ memory model compliance
- Memory barrier insertion guidance
- Race condition detection
- Happens-before reasoning

## Usage Guidelines

1. **Program Analysis**: Parse concurrent program
2. **Model Selection**: Choose memory model
3. **Execution Analysis**: Explore possible executions
4. **Issue Detection**: Find memory model violations
5. **Fence Insertion**: Guide barrier placement

## Dependencies

- CDSChecker, GenMC
- Memory model tools

## Process Integration

- Concurrent Data Structure Design
- Cache Optimization Analysis workflows
