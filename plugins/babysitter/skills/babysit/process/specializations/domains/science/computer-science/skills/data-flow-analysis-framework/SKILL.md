---
name: data-flow-analysis-framework
description: Design and implement data-flow analyses for compiler optimization and program analysis
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

# Data-Flow Analysis Framework

## Purpose

Provides expert guidance on designing and implementing data-flow analyses for compilers.

## Capabilities

- Forward/backward analysis specification
- Lattice definition and verification
- Transfer function generation
- Fixpoint computation (worklist algorithm)
- Analysis soundness verification
- Common analyses (reaching defs, live vars)

## Usage Guidelines

1. **Analysis Design**: Specify analysis goal
2. **Lattice Definition**: Define abstract domain
3. **Transfer Functions**: Implement statement effects
4. **Fixpoint Algorithm**: Configure worklist
5. **Integration**: Connect to compiler

## Dependencies

- LLVM, GCC internals
- Analysis frameworks

## Process Integration

- Compiler Optimization Design
- Abstract Interpretation Analysis workflows
