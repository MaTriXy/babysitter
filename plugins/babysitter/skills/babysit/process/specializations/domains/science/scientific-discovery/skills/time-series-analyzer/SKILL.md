---
name: time-series-analyzer
description: Time series analysis and forecasting
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
  category: statistical-analysis
  domain: scientific-discovery
  backlog-id: SK-SD-020
  tools:
    - statsmodels
    - Prophet
    - pmdarima
  processes:
    - statistical-reasoning
    - deep-time-thinking
    - proxy-reasoning
---

# Time Series Analyzer Skill

## Purpose

Provides time series analysis capabilities for trend detection, seasonality decomposition, and forecasting.

## Capabilities

- **Stationarity Testing**: ADF, KPSS tests
- **Decomposition**: STL, seasonal decomposition
- **ARIMA**: ARIMA/SARIMA modeling
- **Prophet**: Prophet/exponential smoothing
- **Change Points**: Change point detection
- **Uncertainty**: Forecast uncertainty quantification

## Usage Guidelines

1. **Data Preparation**
   - Check stationarity
   - Handle missing values
   - Identify outliers

2. **Model Building**
   - Choose appropriate model
   - Estimate parameters
   - Validate model fit

3. **Forecasting**
   - Generate forecasts
   - Quantify uncertainty
   - Validate predictions

4. **Best Practices**
   - Test stationarity
   - Cross-validate models
   - Report prediction intervals
