export type PromptBuilderInvocation = {
  processId: string;
  args: Record<string, unknown>;
  request: string;
  attachments?: string[];
};

export function buildGuidedPrompt(invocation: PromptBuilderInvocation): string {
  const header = `# process\n\n${invocation.processId}\n`;
  const argsJson = JSON.stringify(invocation.args ?? {}, null, 2);
  const argsBlock = `\n## args\n\n\`\`\`json\n${argsJson}\n\`\`\`\n`;
  const attachments =
    invocation.attachments && invocation.attachments.length > 0
      ? `\n## files\n\n${invocation.attachments.map((uri) => `- ${uri}`).join('\n')}\n`
      : '';
  const request = `\n## request\n\n${(invocation.request ?? '').trim()}\n`;
  return `${header}${argsBlock}${attachments}${request}`.trimEnd() + '\n';
}
