---
name: linearizability-checker
description: Check linearizability of concurrent data structure implementations
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

# Linearizability Checker

## Purpose

Provides expert guidance on checking linearizability of concurrent data structures.

## Capabilities

- History linearization algorithms
- Linearization point identification
- Counterexample generation for violations
- Concurrent history visualization
- Linearizability proof templates
- Progress property checking

## Usage Guidelines

1. **History Collection**: Gather execution history
2. **Linearization Attempt**: Search for valid linearization
3. **Counterexample Analysis**: Examine violations
4. **Proof Construction**: Build linearizability proof
5. **Documentation**: Record verification results

## Dependencies

- LineUp
- Wing-Gong algorithm

## Process Integration

- Concurrent Data Structure Design
- Distributed Consensus Protocol Design workflows
