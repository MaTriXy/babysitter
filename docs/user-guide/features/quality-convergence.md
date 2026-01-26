# Quality Convergence: Iterative Improvement Until Targets Met

**Version:** 1.0
**Last Updated:** 2026-01-25
**Category:** Feature Guide

---

## Overview

Quality convergence is an iterative improvement pattern where Babysitter repeatedly refines work until a defined quality target is achieved. Instead of executing a task once and hoping for the best, quality convergence loops through implementation, testing, and scoring cycles until the output meets your standards.

### Why Use Quality Convergence

- **Consistent Quality**: Guarantee outputs meet minimum quality thresholds
- **Automated Refinement**: Let the system iterate without manual intervention
- **Measurable Results**: Track quality scores across iterations
- **Predictable Outcomes**: Set clear targets and iteration limits
- **TDD Integration**: Combine with test-driven development for robust code

---

## Use Cases and Scenarios

### Scenario 1: TDD Feature Development

Build a feature with test-driven development, iterating until test coverage and quality targets are met.

```javascript
export async function process(inputs, ctx) {
  const { feature, targetQuality = 85, maxIterations = 5 } = inputs;

  let iteration = 0;
  let quality = 0;

  while (iteration < maxIterations && quality < targetQuality) {
    iteration++;
    ctx.log(`[Iteration ${iteration}/${maxIterations}] Starting TDD implementation...`);

    // Write tests first
    const tests = await ctx.task(writeTestsTask, { feature, iteration });

    // Implement code to pass tests
    const impl = await ctx.task(implementTask, { tests, feature });

    // Run quality checks
    const [coverage, lint, security] = await ctx.parallel.all([
      () => ctx.task(coverageTask, {}),
      () => ctx.task(lintTask, {}),
      () => ctx.task(securityTask, {})
    ]);

    // Agent scores quality
    const score = await ctx.task(agentScoringTask, {
      tests, impl, coverage, lint, security
    });

    quality = score.overall;
    ctx.log(`Quality score: ${quality}/${targetQuality}`);
  }

  return { converged: quality >= targetQuality, iterations: iteration, quality };
}
```

### Scenario 2: Code Quality Improvement

Iteratively improve existing code until it meets quality standards.

```javascript
export async function process(inputs, ctx) {
  const { files, targetScore = 90, maxIterations = 10 } = inputs;

  let iteration = 0;
  let currentScore = 0;

  // Initial assessment
  currentScore = await ctx.task(assessQualityTask, { files });
  ctx.log(`Initial quality score: ${currentScore}`);

  while (iteration < maxIterations && currentScore < targetScore) {
    iteration++;

    // Identify improvements
    const improvements = await ctx.task(identifyImprovementsTask, {
      files,
      currentScore,
      targetScore
    });

    // Apply improvements
    await ctx.task(applyImprovementsTask, { improvements });

    // Re-assess
    currentScore = await ctx.task(assessQualityTask, { files });
    ctx.log(`Iteration ${iteration}: Quality score ${currentScore}/${targetScore}`);
  }

  return { achieved: currentScore >= targetScore, finalScore: currentScore };
}
```

### Scenario 3: Documentation Generation

Generate documentation and refine until it meets completeness standards.

```javascript
export async function process(inputs, ctx) {
  const { codebase, targetCompleteness = 80, maxIterations = 3 } = inputs;

  let iteration = 0;
  let completeness = 0;

  while (iteration < maxIterations && completeness < targetCompleteness) {
    iteration++;

    // Generate or improve documentation
    await ctx.task(generateDocsTask, { codebase, iteration });

    // Assess completeness
    const assessment = await ctx.task(assessDocsCompletenessTask, { codebase });
    completeness = assessment.completenessScore;

    ctx.log(`Documentation completeness: ${completeness}%`);
  }

  return { complete: completeness >= targetCompleteness, completeness };
}
```

---

## Step-by-Step Instructions

### Step 1: Define Quality Targets

Determine what quality means for your use case.

**Common quality metrics:**
- Test coverage percentage (e.g., 85%)
- Lint error count (e.g., 0 errors)
- Security vulnerability count (e.g., 0 critical)
- Overall quality score (e.g., 90/100)

### Step 2: Set Iteration Limits

Prevent infinite loops by setting a maximum number of iterations.

```javascript
const { targetQuality = 85, maxIterations = 5 } = inputs;
```

**Recommendations:**
- Simple improvements: 3-5 iterations
- Complex refactoring: 5-10 iterations
- Large features: 10-15 iterations

### Step 3: Implement the Convergence Loop

Create a loop that continues until the target is met or iterations are exhausted.

```javascript
let iteration = 0;
let quality = 0;

while (iteration < maxIterations && quality < targetQuality) {
  iteration++;

  // Perform work
  // ...

  // Measure quality
  quality = await measureQuality();

  ctx.log(`Iteration ${iteration}: ${quality}/${targetQuality}`);
}
```

### Step 4: Implement Quality Scoring

Create a task that evaluates quality based on your criteria.

```javascript
export const agentQualityScoringTask = defineTask('quality-scorer', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Score implementation quality',
  agent: {
    name: 'quality-assessor',
    prompt: {
      role: 'senior quality assurance engineer',
      task: 'Analyze implementation quality and provide a score from 0-100',
      context: {
        tests: args.tests,
        implementation: args.implementation,
        coverage: args.coverage,
        lint: args.lint,
        security: args.security
      },
      instructions: [
        'Review test quality (weight: 25%)',
        'Review implementation quality (weight: 30%)',
        'Review code metrics (weight: 20%)',
        'Review security (weight: 15%)',
        'Review alignment with requirements (weight: 10%)',
        'Provide recommendations for improvement'
      ]
    }
  }
}));
```

### Step 5: Add Feedback to Subsequent Iterations

Pass quality feedback to the next iteration to guide improvements.

```javascript
const iterationResults = [];

while (iteration < maxIterations && quality < targetQuality) {
  iteration++;

  const previousFeedback = iteration > 1
    ? iterationResults[iteration - 2].recommendations
    : null;

  const impl = await ctx.task(implementTask, {
    feature,
    previousFeedback  // Guide improvements based on previous scoring
  });

  const score = await ctx.task(agentScoringTask, { impl });

  iterationResults.push({
    iteration,
    quality: score.overall,
    recommendations: score.recommendations
  });

  quality = score.overall;
}
```

---

## Configuration Options

### Quality Target Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `targetQuality` | number | 85 | Target quality score (0-100) |
| `maxIterations` | number | 5 | Maximum number of iterations before stopping |

### Scoring Weights Configuration

Customize how different aspects contribute to the overall score.

```javascript
const scoringWeights = {
  tests: 0.25,          // 25% weight for test quality
  implementation: 0.30,  // 30% weight for implementation quality
  codeQuality: 0.20,     // 20% weight for code metrics
  security: 0.15,        // 15% weight for security
  alignment: 0.10        // 10% weight for requirements alignment
};
```

### Early Exit Conditions

Configure conditions that stop iteration early.

```javascript
// Stop if quality plateaus (no improvement in last N iterations)
if (qualityHistory.length >= 3) {
  const lastThree = qualityHistory.slice(-3);
  const improvement = lastThree[2] - lastThree[0];
  if (improvement < 1) {
    ctx.log('Quality plateaued, stopping early');
    break;
  }
}
```

---

## Code Examples and Best Practices

### Example 1: Full TDD Quality Convergence Process

Complete process definition demonstrating all quality convergence patterns.

```javascript
export async function process(inputs, ctx) {
  const {
    feature = 'User authentication',
    targetQuality = 85,
    maxIterations = 5
  } = inputs;

  // Phase 1: Planning
  const plan = await ctx.task(agentPlanningTask, { feature });

  await ctx.breakpoint({
    question: `Review the plan for "${feature}". Approve to proceed?`,
    title: 'Plan Review',
    context: { runId: ctx.runId, files: [{ path: 'artifacts/plan.md', format: 'markdown' }] }
  });

  // Phase 2: Quality Convergence Loop
  let iteration = 0;
  let quality = 0;
  const iterationResults = [];

  while (iteration < maxIterations && quality < targetQuality) {
    iteration++;
    ctx.log(`[Iteration ${iteration}/${maxIterations}]`);

    // TDD: Write tests first
    const tests = await ctx.task(writeTestsTask, {
      feature,
      plan,
      iteration,
      previousFeedback: iteration > 1 ? iterationResults[iteration - 2].feedback : null
    });

    // Run tests (expect failures on first iteration)
    await ctx.task(runTestsTask, { testFiles: tests.testFiles, expectFailures: iteration === 1 });

    // Implement to pass tests
    const impl = await ctx.task(implementTask, {
      feature,
      tests,
      iteration,
      previousFeedback: iteration > 1 ? iterationResults[iteration - 2].feedback : null
    });

    // Run tests again
    const testResults = await ctx.task(runTestsTask, { testFiles: tests.testFiles });

    // Parallel quality checks
    const [coverage, lint, typeCheck, security] = await ctx.parallel.all([
      () => ctx.task(coverageTask, {}),
      () => ctx.task(lintTask, { files: impl.filesModified }),
      () => ctx.task(typeCheckTask, { files: impl.filesModified }),
      () => ctx.task(securityTask, { files: impl.filesModified })
    ]);

    // Agent quality scoring
    const score = await ctx.task(agentQualityScoringTask, {
      tests,
      testResults,
      implementation: impl,
      qualityChecks: { coverage, lint, typeCheck, security },
      iteration,
      targetQuality
    });

    quality = score.overallScore;
    iterationResults.push({
      iteration,
      quality,
      feedback: score.recommendations
    });

    ctx.log(`Quality: ${quality}/${targetQuality}`);

    if (quality >= targetQuality) {
      ctx.log('Target quality achieved!');
    }
  }

  // Final approval
  await ctx.breakpoint({
    question: `Quality: ${quality}/${targetQuality}. Approve for merge?`,
    title: 'Final Review',
    context: { runId: ctx.runId, files: [{ path: 'artifacts/final-report.md', format: 'markdown' }] }
  });

  return {
    success: quality >= targetQuality,
    iterations: iteration,
    finalQuality: quality,
    iterationResults
  };
}
```

### Example 2: Quality Scoring Task Definition

```javascript
export const agentQualityScoringTask = defineTask('quality-scorer', (args, taskCtx) => ({
  kind: 'agent',
  title: `Score quality (iteration ${args.iteration})`,
  description: 'Comprehensive quality assessment with agent',

  agent: {
    name: 'quality-assessor',
    prompt: {
      role: 'senior quality assurance engineer and code reviewer',
      task: 'Analyze implementation quality across multiple dimensions',
      context: {
        feature: args.feature,
        tests: args.tests,
        testResults: args.testResults,
        implementation: args.implementation,
        qualityChecks: args.qualityChecks,
        iteration: args.iteration,
        targetQuality: args.targetQuality
      },
      instructions: [
        'Review test quality: coverage, edge cases, assertions (weight: 25%)',
        'Review implementation quality: correctness, readability (weight: 30%)',
        'Review code metrics: lint, types, complexity (weight: 20%)',
        'Review security: vulnerabilities, input validation (weight: 15%)',
        'Review requirements alignment (weight: 10%)',
        'Calculate weighted overall score (0-100)',
        'Provide prioritized recommendations for improvement'
      ],
      outputFormat: 'JSON with overallScore, scores by dimension, recommendations'
    },
    outputSchema: {
      type: 'object',
      required: ['overallScore', 'scores', 'recommendations'],
      properties: {
        overallScore: { type: 'number', minimum: 0, maximum: 100 },
        scores: {
          type: 'object',
          properties: {
            tests: { type: 'number' },
            implementation: { type: 'number' },
            codeQuality: { type: 'number' },
            security: { type: 'number' },
            alignment: { type: 'number' }
          }
        },
        recommendations: { type: 'array', items: { type: 'string' } }
      }
    }
  },

  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));
```

### Best Practices

1. **Set Realistic Targets**: Aim for achievable quality scores (80-90% is often reasonable)
2. **Limit Iterations**: Prevent runaway loops with sensible limits (5-10 iterations typically)
3. **Use Parallel Checks**: Run independent quality checks concurrently for efficiency
4. **Provide Feedback**: Pass recommendations from scoring to subsequent iterations
5. **Log Progress**: Track quality scores across iterations for visibility
6. **Include Breakpoints**: Add approval gates at key milestones

---

## Common Pitfalls and Troubleshooting

### Pitfall 1: Quality Score Not Improving

**Symptom:**
```
Iteration 1: Quality 65/100
Iteration 2: Quality 66/100
Iteration 3: Quality 65/100
Iteration 4: Quality 67/100
Iteration 5: Quality 66/100
Target not met: 85/100
```

**Causes:**
- Quality target is unrealistic for the codebase
- Scoring criteria are too strict
- Fundamental issues blocking improvement

**Solutions:**

1. Review iteration feedback to identify blocking issues:
   ```bash
   jq '.recommendations' .a5c/runs/<runId>/tasks/*/result.json
   ```

2. Adjust quality target:
   ```javascript
   const { targetQuality = 75 } = inputs;  // Lower target
   ```

3. Increase iteration limit:
   ```javascript
   const { maxIterations = 10 } = inputs;  // More iterations
   ```

4. Review scoring weights for balance

### Pitfall 2: Too Many Iterations

**Symptom:** Process runs for many iterations before converging.

**Cause:** Target is too high or improvements are too granular.

**Solutions:**

1. Implement early exit on plateau:
   ```javascript
   const recentScores = iterationResults.slice(-3).map(r => r.quality);
   if (Math.max(...recentScores) - Math.min(...recentScores) < 2) {
     ctx.log('Quality plateaued, stopping early');
     break;
   }
   ```

2. Increase improvement scope per iteration

3. Lower quality target to realistic level

### Pitfall 3: Inconsistent Quality Scores

**Symptom:** Quality scores vary significantly between iterations without clear reason.

**Cause:** Non-deterministic scoring or external factors.

**Solution:**

1. Use deterministic scoring criteria
2. Ensure `ctx.now()` is used instead of `Date.now()` for timestamps
3. Review agent scoring prompts for consistency

### Pitfall 4: Iteration Takes Too Long

**Symptom:** Each iteration takes several minutes.

**Cause:** Sequential execution of independent tasks.

**Solution:** Use parallel execution:

```javascript
// Slow: Sequential
const coverage = await ctx.task(coverageTask, {});
const lint = await ctx.task(lintTask, {});
const security = await ctx.task(securityTask, {});

// Fast: Parallel
const [coverage, lint, security] = await ctx.parallel.all([
  () => ctx.task(coverageTask, {}),
  () => ctx.task(lintTask, {}),
  () => ctx.task(securityTask, {})
]);
```

---

## Related Documentation

- [Process Definitions](./process-definitions.md) - Learn to create quality convergence processes
- [Parallel Execution](./parallel-execution.md) - Optimize quality checks with parallelism
- [Breakpoints](./breakpoints.md) - Add approval gates to quality convergence workflows
- [Best Practices](./best-practices.md) - Patterns for setting targets, custom scoring strategies, and balancing speed vs thoroughness

---

## Summary

Quality convergence enables automated iterative improvement until defined quality targets are met. Combine quality scoring, feedback loops, and sensible iteration limits to ensure consistent, high-quality outputs. Use parallel execution for efficiency and breakpoints for human oversight at critical milestones.
