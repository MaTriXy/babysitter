---
name: bayesian-inference-engine
description: Bayesian probabilistic reasoning for inference
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
  category: hypothesis-reasoning
  domain: scientific-discovery
  backlog-id: SK-SD-008
  tools:
    - PyMC
    - Stan (PyStan)
    - ArviZ
    - NumPyro
  processes:
    - bayesian-probabilistic-reasoning
    - likelihood-based-reasoning
    - probabilistic-forecasting
---

# Bayesian Inference Engine Skill

## Purpose

Provides Bayesian probabilistic reasoning capabilities for prior specification, posterior computation, and belief updating.

## Capabilities

- **Prior Elicitation**: Prior elicitation support
- **MCMC Sampling**: NUTS and HMC sampling
- **Variational Inference**: Variational inference methods
- **Model Comparison**: Bayes factors, LOO-CV comparison
- **Posterior Checking**: Posterior predictive checking
- **Sequential Update**: Sequential belief updating

## Usage Guidelines

1. **Model Specification**
   - Elicit priors carefully
   - Define likelihood appropriately
   - Check prior predictive

2. **Inference**
   - Monitor convergence
   - Check diagnostics
   - Validate with posterior checks

3. **Model Comparison**
   - Use appropriate criteria
   - Consider model complexity
   - Report uncertainties

4. **Best Practices**
   - Document prior choices
   - Run multiple chains
   - Perform sensitivity analysis
