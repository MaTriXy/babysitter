export function normalizeMermaidMarkdown(markdown: string): string {
  const text = typeof markdown === 'string' ? markdown : String(markdown ?? '');
  if (!text.trim()) {
    return '```mermaid\n```';
  }

  const hasCompleteMermaidFence = /```+\s*mermaid\b[\s\S]*?```+/i.test(text);
  if (hasCompleteMermaidFence) {
    return text;
  }

  let body = text;
  const leadingFence = body.match(/^\s*`{1,3}\s*(?:mermaid\b)?\s*\r?\n/i);
  if (leadingFence) {
    body = body.slice(leadingFence[0].length);
  }

  body = body.replace(/(?:\r?\n)?`{1,3}\s*$/, '');

  if (!body.trim()) {
    return '```mermaid\n```';
  }

  if (!/\r?\n$/.test(body)) {
    body += '\n';
  }

  return '```mermaid\n' + body + '```';
}
