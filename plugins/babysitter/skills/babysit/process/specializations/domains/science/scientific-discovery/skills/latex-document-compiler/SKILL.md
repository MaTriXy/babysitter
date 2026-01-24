---
name: latex-document-compiler
description: LaTeX document preparation
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
  category: scientific-writing
  domain: scientific-discovery
  backlog-id: SK-SD-028
  tools:
    - latexmk
    - biber
    - pandoc
  processes:
    - literature-review-synthesis
    - pre-registration-documentation
    - scientific-writing
---

# LaTeX Document Compiler Skill

## Purpose

Provides LaTeX document preparation capabilities for manuscript formatting, bibliography management, and journal submission.

## Capabilities

- **Templates**: Journal template application
- **Bibliography**: BibTeX/BibLaTeX integration
- **Figures/Tables**: Figure/table formatting
- **Cross-References**: Cross-reference management
- **Compilation**: PDF compilation
- **Submission**: Submission package preparation

## Usage Guidelines

1. **Setup**
   - Select journal template
   - Configure bibliography
   - Set up structure

2. **Writing**
   - Use appropriate environments
   - Manage cross-references
   - Format figures and tables

3. **Compilation**
   - Compile document
   - Resolve errors
   - Prepare submission package

4. **Best Practices**
   - Use version control
   - Modularize document
   - Test compilation regularly
