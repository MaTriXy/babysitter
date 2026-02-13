/**
 * @process specializations/web-development/browser-flow-agent-browser
 * @description Browser flow orchestration using first-class `browser` tasks with run-scoped sessions.
 * @inputs { startUrl?: string, validationUrl?: string, goal?: string, runtime?: "auto"|"container"|"host" }
 * @outputs { success: boolean, runtime: string, sessionMode: string, first: object, second: object }
 */

import { browserTask } from '@a5c-ai/babysitter-sdk';

export async function process(inputs, ctx) {
  const {
    startUrl = 'https://example.com',
    validationUrl = 'https://example.com/docs',
    goal = 'Collect a concise status summary from both pages',
    runtime = 'auto',
  } = inputs ?? {};

  ctx.log('info', `Starting browser flow (runtime=${runtime}, sessionMode=run)`);

  const first = await ctx.task(navigateAndSummarizeTask, {
    startUrl,
    goal,
    runtime,
  });

  const second = await ctx.task(verifyAndCompareTask, {
    validationUrl,
    goal,
    runtime,
    previousResult: first,
  });

  return {
    success: true,
    runtime,
    sessionMode: 'run',
    first,
    second,
  };
}

export const navigateAndSummarizeTask = browserTask('browser-flow.navigate-and-summarize', {
  title: (args) => `Browser: summarize ${args.startUrl}`,
  prompt: (args) =>
    [
      `Open ${args.startUrl}.`,
      `Goal: ${args.goal}.`,
      'Return a JSON object with keys: pageTitle, keyFindings, and risks.',
    ].join(' '),
  runtime: (args) => args.runtime,
  sessionMode: () => 'run',
  output: () => 'json',
  labels: () => ['browser', 'web-development', 'flow-step-1'],
});

export const verifyAndCompareTask = browserTask('browser-flow.verify-and-compare', {
  title: (args) => `Browser: verify ${args.validationUrl}`,
  prompt: (args) => {
    const previous = JSON.stringify(args.previousResult ?? {}, null, 2);
    return [
      `Open ${args.validationUrl}.`,
      `Goal: ${args.goal}.`,
      `Prior result for comparison: ${previous}`,
      'Return JSON with keys: changesDetected, validationNotes, and finalRecommendation.',
    ].join(' ');
  },
  runtime: (args) => args.runtime,
  sessionMode: () => 'run',
  output: () => 'json',
  labels: () => ['browser', 'web-development', 'flow-step-2'],
});
