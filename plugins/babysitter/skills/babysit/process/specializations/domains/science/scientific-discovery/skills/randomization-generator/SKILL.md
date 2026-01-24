---
name: randomization-generator
description: Randomization protocol generation
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
metadata:
  version: "1.0"
  category: experimental-design
  domain: scientific-discovery
  backlog-id: SK-SD-014
  tools:
    - scipy
    - random
    - custom protocols
  processes:
    - experimental-design-controls
    - pre-registration
---

# Randomization Generator Skill

## Purpose

Provides randomization protocol capabilities for allocation sequence generation, stratified randomization, and block randomization.

## Capabilities

- **Simple Randomization**: Simple randomization
- **Block Randomization**: Fixed/permuted block randomization
- **Stratified**: Stratified randomization
- **Adaptive**: Minimization/adaptive randomization
- **Concealment**: Allocation concealment verification
- **Audit Trail**: Randomization audit trail

## Usage Guidelines

1. **Protocol Selection**
   - Choose randomization method
   - Define stratification factors
   - Set block sizes

2. **Implementation**
   - Generate allocation sequence
   - Ensure concealment
   - Document process

3. **Verification**
   - Check balance
   - Audit allocations
   - Verify concealment

4. **Best Practices**
   - Pre-specify method
   - Use secure generation
   - Maintain audit trails
