---
name: elicit-research-assistant
description: AI-assisted literature review for question-answering
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
  category: literature-knowledge
  domain: scientific-discovery
  backlog-id: SK-SD-004
  tools:
    - Elicit API
    - LangChain
    - vector databases
  processes:
    - literature-review-synthesis
    - analysis-competing-hypotheses
    - multiple-working-hypotheses
---

# Elicit Research Assistant Skill

## Purpose

Provides AI-assisted literature review capabilities for question-answering over papers, claim extraction, and evidence synthesis.

## Capabilities

- **Question Answering**: Answer questions over research papers
- **Claim Extraction**: Extract and verify claims
- **Evidence Assessment**: Assess evidence strength
- **Methodology Comparison**: Compare methodologies
- **Finding Synthesis**: Synthesize findings across papers
- **Gap Identification**: Identify research gaps

## Usage Guidelines

1. **Query Formulation**
   - Frame specific questions
   - Define scope clearly
   - Prioritize questions

2. **Evidence Analysis**
   - Assess claim strength
   - Compare findings
   - Track contradictions

3. **Synthesis**
   - Integrate findings
   - Identify patterns
   - Document gaps

4. **Best Practices**
   - Verify AI outputs
   - Cross-check claims
   - Document reasoning
