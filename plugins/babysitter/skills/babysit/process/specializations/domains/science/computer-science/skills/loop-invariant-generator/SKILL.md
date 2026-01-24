---
name: loop-invariant-generator
description: Automatically generate and verify loop invariants for algorithm correctness proofs
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
  category: verification
  phase: 6
---

# Loop Invariant Generator

## Purpose

Provides expert guidance on generating and verifying loop invariants for proving algorithm correctness.

## Capabilities

- Infer candidate loop invariants from code structure
- Verify initialization, maintenance, and termination conditions
- Generate formal proof templates
- Handle nested loops and complex data structures
- Export to theorem provers (Dafny, Why3)
- Document invariant derivation

## Usage Guidelines

1. **Code Analysis**: Parse loop structure
2. **Invariant Inference**: Generate candidate invariants
3. **Verification**: Check three conditions
4. **Export**: Generate theorem prover input
5. **Documentation**: Explain invariant meaning

## Dependencies

- Static analysis tools
- SMT solvers (Z3)
- Theorem provers

## Process Integration

- Algorithm Correctness Proof
- Abstract Interpretation Analysis workflows
