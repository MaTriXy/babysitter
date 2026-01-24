---
name: theorem-prover-interface
description: Interface with interactive theorem provers including Coq, Isabelle, and Lean
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

# Theorem Prover Interface

## Purpose

Provides expert guidance on using interactive theorem provers for formal verification.

## Capabilities

- Coq proof script generation
- Isabelle/HOL interface
- Lean 4 integration
- Proof automation (hammers, tactics)
- Proof library search
- Program extraction

## Usage Guidelines

1. **Prover Selection**: Choose appropriate prover
2. **Formalization**: Encode problem in prover
3. **Proof Development**: Construct proof
4. **Automation**: Apply proof tactics
5. **Extraction**: Generate verified code

## Dependencies

- Coq, Isabelle, Lean
- Proof automation tools

## Process Integration

- Theorem Prover Verification
- Algorithm Correctness Proof workflows
