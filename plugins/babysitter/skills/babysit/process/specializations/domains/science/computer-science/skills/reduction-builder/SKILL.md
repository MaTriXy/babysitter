---
name: reduction-builder
description: Construct and verify polynomial-time reductions between computational problems
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
  category: complexity-theory
  phase: 6
---

# Reduction Builder

## Purpose

Provides expert guidance on constructing polynomial-time reductions for NP-completeness proofs and problem classification.

## Capabilities

- Gadget library for common reductions (3-SAT, Vertex Cover, etc.)
- Reduction verification (correctness in both directions)
- Polynomial-time verification
- Visualization of gadget constructions
- Generate reduction documentation
- Chain reductions for new problems

## Usage Guidelines

1. **Problem Definition**: Specify source and target problems
2. **Gadget Selection**: Choose or design gadgets
3. **Construction**: Build the reduction
4. **Verification**: Prove both directions
5. **Documentation**: Generate formal proof

## Dependencies

- Graph visualization
- Formal verification tools

## Process Integration

- NP-Completeness Proof
- Computational Problem Classification workflows
