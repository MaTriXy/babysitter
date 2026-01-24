---
name: ssa-transformation-library
description: SSA-form transformations and optimizations for compiler intermediate representations
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
  category: compilers
  phase: 6
---

# SSA Transformation Library

## Purpose

Provides expert guidance on SSA form construction and SSA-based compiler optimizations.

## Capabilities

- SSA construction (dominance-based)
- Phi node insertion and elimination
- SSA-based optimization templates
- Dominance tree computation
- Use-def chain analysis
- SSA deconstruction

## Usage Guidelines

1. **CFG Analysis**: Build control flow graph
2. **Dominance Computation**: Calculate dominators
3. **SSA Construction**: Insert phi nodes
4. **Optimization**: Apply SSA-based transforms
5. **Deconstruction**: Convert back from SSA

## Dependencies

- LLVM IR
- SSA libraries

## Process Integration

- Compiler Optimization Design workflows
