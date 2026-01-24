---
name: pubmed-literature-miner
description: Biomedical literature mining using PubMed/MEDLINE
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
  backlog-id: SK-SD-002
  tools:
    - Biopython
    - PyMed
    - NCBI E-utilities
  processes:
    - literature-review-synthesis
    - hypothesis-formulation-testing
    - evidence-triangulation
---

# PubMed Literature Miner Skill

## Purpose

Provides biomedical literature mining capabilities using PubMed/MEDLINE for systematic review support, MeSH term extraction, and PICO framework analysis.

## Capabilities

- **MeSH Search**: MeSH term-based search
- **PICO Extraction**: PICO element extraction
- **Screening**: Abstract screening automation
- **Deduplication**: Citation deduplication
- **PRISMA Support**: PRISMA flow diagram data generation
- **Full-Text**: Full-text retrieval coordination

## Usage Guidelines

1. **Search Construction**
   - Use appropriate MeSH terms
   - Apply Boolean operators
   - Set date and filter limits

2. **Systematic Review**
   - Follow PRISMA guidelines
   - Document search strategy
   - Track screening decisions

3. **Data Extraction**
   - Extract PICO elements
   - Capture study characteristics
   - Record quality assessments

4. **Best Practices**
   - Save search strategies
   - Use citation managers
   - Document exclusions
