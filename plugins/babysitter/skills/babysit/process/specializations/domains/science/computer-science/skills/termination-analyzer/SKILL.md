---
name: termination-analyzer
description: Prove termination of algorithms and programs through ranking functions and well-founded orderings
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

# Termination Analyzer

## Purpose

Provides expert guidance on proving algorithm and program termination through various techniques.

## Capabilities

- Identify ranking/variant functions automatically
- Prove well-founded orderings
- Handle mutual recursion
- Detect potential non-termination
- Generate termination certificates
- Interface with termination provers

## Usage Guidelines

1. **Program Analysis**: Parse control flow
2. **Ranking Function**: Identify or synthesize
3. **Well-Foundedness**: Prove ordering
4. **Certificate**: Generate termination proof
5. **Documentation**: Explain termination argument

## Dependencies

- AProVE, T2
- SMT solvers

## Process Integration

- Algorithm Correctness Proof
- Decidability Analysis workflows
