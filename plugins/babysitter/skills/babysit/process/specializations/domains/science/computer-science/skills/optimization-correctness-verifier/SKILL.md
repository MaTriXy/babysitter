---
name: optimization-correctness-verifier
description: Verify correctness of compiler optimizations through semantic preservation checking
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

# Optimization Correctness Verifier

## Purpose

Provides expert guidance on verifying compiler optimization correctness.

## Capabilities

- Semantic preservation checking
- Alive2-style verification
- Bisimulation proof construction
- Counterexample generation
- Optimization refinement suggestions
- CompCert-style verification

## Usage Guidelines

1. **Optimization Specification**: Define transformation
2. **Semantic Model**: Specify program semantics
3. **Verification**: Check semantic preservation
4. **Counterexample Analysis**: Examine violations
5. **Refinement**: Fix incorrect optimizations

## Dependencies

- Alive2
- CompCert, SMT solvers

## Process Integration

- Compiler Optimization Design workflows
