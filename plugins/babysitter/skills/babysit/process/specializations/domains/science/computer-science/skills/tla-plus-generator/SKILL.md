---
name: tla-plus-generator
description: Generate and analyze TLA+ specifications for distributed systems verification
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
  category: distributed-systems
  phase: 6
---

# TLA+ Generator

## Purpose

Provides expert guidance on creating TLA+ specifications for distributed system verification.

## Capabilities

- TLA+ module generation from protocol description
- Invariant and temporal property specification
- State space exploration configuration
- PlusCal to TLA+ translation
- Model checking execution
- Counterexample analysis

## Usage Guidelines

1. **Protocol Description**: Describe system informally
2. **State Definition**: Define state variables
3. **Action Specification**: Write state transitions
4. **Property Specification**: Define safety/liveness
5. **Model Checking**: Configure and run TLC

## Dependencies

- TLA+ Toolbox
- TLC model checker

## Process Integration

- Distributed Consensus Protocol Design
- Model Checking Verification workflows
