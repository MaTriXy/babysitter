import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import type { OProcessInteractionTracker } from '../core/oProcessInteraction';
import type { Run } from '../core/run';
import type { RunChangeBatch } from '../core/runFileChanges';
import { TextFileTailer } from '../core/textTailer';

type LogSourceId = 'process' | 'journal' | 'workSummaryLatest';

type WebviewInboundMessage =
  | { type: 'ready' }
  | { type: 'copy'; text: string }
  | { type: 'clear'; sourceId: LogSourceId };

type WebviewOutboundMessage =
  | {
      type: 'init';
      runId: string;
      sources: Array<{ id: LogSourceId; label: string }>;
      activeSourceId: LogSourceId;
    }
  | { type: 'set'; sourceId: LogSourceId; text: string }
  | { type: 'append'; sourceId: LogSourceId; text: string }
  | { type: 'status'; text: string };

function nonce(len = 16): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function renderWebviewHtml(webview: vscode.Webview): string {
  const cspSource = webview.cspSource;
  const scriptNonce = nonce();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${scriptNonce}';" />
  <title>Babysitter Logs</title>
  <style>
    :root {
      --pad: 14px;
      --card: var(--vscode-editorWidget-background);
      --border: var(--vscode-editorWidget-border);
      --muted: var(--vscode-descriptionForeground);
      --accent: var(--vscode-button-background);
      --accentText: var(--vscode-button-foreground);
    }
    body {
      padding: 0;
      margin: 0;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      padding: var(--pad);
      border-bottom: 1px solid var(--border);
      background: var(--vscode-editor-background);
    }
    .title {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .title h1 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .subtitle {
      color: var(--muted);
      font-size: 12px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .controls {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    input[type="text"] {
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--vscode-foreground);
      border-radius: 6px;
      padding: 6px 10px;
      min-width: 220px;
    }
    select {
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--vscode-foreground);
      border-radius: 6px;
      padding: 6px 10px;
    }
    button {
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--vscode-foreground);
      border-radius: 6px;
      padding: 6px 10px;
      cursor: pointer;
    }
    button.primary {
      background: var(--accent);
      color: var(--accentText);
      border-color: transparent;
    }
    input[type="text"]:focus-visible,
    select:focus-visible,
    button:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }
    main {
      padding: var(--pad);
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--muted);
      font-size: 12px;
      min-height: 18px;
    }
    pre {
      margin: 0;
      flex: 1;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--card);
      overflow: auto;
      white-space: pre;
      tab-size: 2;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .checkbox {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      user-select: none;
    }
    .checkbox input { margin: 0; }
    .spinner {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      border: 2px solid var(--border);
      border-top-color: var(--vscode-progressBar-background);
      animation: spin 1s linear infinite;
    }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <header>
    <div class="title">
      <h1 id="title">Babysitter Logs</h1>
      <div class="subtitle">
        <span id="runId"></span>
        <span id="activeSourceLabel"></span>
      </div>
    </div>
    <div class="controls">
      <select id="sourceSelect" aria-label="Log source"></select>
      <input id="filter" type="text" placeholder="Filter (substring or /regex/)" />
      <label class="checkbox"><input id="follow" type="checkbox" checked />Follow</label>
      <button id="copy" class="primary">Copy</button>
      <button id="clear">Clear</button>
    </div>
  </header>
  <main>
    <div class="meta">
      <span class="pill"><span id="spinner" class="spinner" style="display:none;"></span><span id="lineCount">0 lines</span></span>
      <span id="status" role="status" aria-live="polite"></span>
    </div>
    <pre id="output">Loading...</pre>
  </main>

  <script nonce="${scriptNonce}">
    const vscode = acquireVsCodeApi();

    const els = {
      title: document.getElementById('title'),
      runId: document.getElementById('runId'),
      activeSourceLabel: document.getElementById('activeSourceLabel'),
      sourceSelect: document.getElementById('sourceSelect'),
      filter: document.getElementById('filter'),
      follow: document.getElementById('follow'),
      output: document.getElementById('output'),
      status: document.getElementById('status'),
      spinner: document.getElementById('spinner'),
      lineCount: document.getElementById('lineCount'),
      copy: document.getElementById('copy'),
      clear: document.getElementById('clear'),
    };

    const state = {
      runId: '',
      sources: [],
      activeSourceId: 'process',
      textBySource: new Map(),
    };

    function setStatus(text) {
      els.status.textContent = text || '';
    }

    function setLoading(loading, text) {
      els.spinner.style.display = loading ? '' : 'none';
      if (loading) els.output.textContent = 'Loading...';
      setStatus(text || '');
    }

    function parseFilter(raw) {
      const s = (raw || '').trim();
      if (!s) return { kind: 'none' };
      if (s.startsWith('/') && s.lastIndexOf('/') > 0) {
        const last = s.lastIndexOf('/');
        const body = s.slice(1, last);
        const flags = s.slice(last + 1);
        try {
          return { kind: 'regex', regex: new RegExp(body, flags) };
        } catch (e) {
          return { kind: 'invalid', message: String(e && e.message ? e.message : e) };
        }
      }
      return { kind: 'substring', needle: s.toLowerCase() };
    }

    function getActiveText() {
      return state.textBySource.get(state.activeSourceId) || '';
    }

    function render() {
      const rawText = getActiveText();
      const filter = parseFilter(els.filter.value);
      if (filter.kind === 'invalid') {
        setStatus('Invalid filter: ' + filter.message);
      } else {
        setStatus('');
      }

      const lines = rawText.split(/\\r?\\n/);
      const out = [];
      if (filter.kind === 'none') {
        for (const l of lines) out.push(l);
      } else if (filter.kind === 'substring') {
        for (const l of lines) {
          if (l.toLowerCase().includes(filter.needle)) out.push(l);
        }
      } else if (filter.kind === 'regex') {
        for (const l of lines) {
          if (filter.regex.test(l)) out.push(l);
        }
      } else {
        for (const l of lines) out.push(l);
      }

      els.output.textContent = out.join('\\n');
      els.lineCount.textContent = out.length + ' lines';

      if (els.follow.checked) {
        // Delay to allow the <pre> to render.
        setTimeout(() => {
          els.output.scrollTop = els.output.scrollHeight;
        }, 0);
      }
    }

    function setActiveSource(sourceId) {
      state.activeSourceId = sourceId;
      const src = state.sources.find((s) => s.id === sourceId);
      els.activeSourceLabel.textContent = src ? src.label : '';
      render();
    }

    els.sourceSelect.addEventListener('change', () => {
      setActiveSource(els.sourceSelect.value);
    });
    els.filter.addEventListener('input', () => render());
    els.follow.addEventListener('change', () => render());

    els.copy.addEventListener('click', () => {
      const text = els.output.textContent || '';
      vscode.postMessage({ type: 'copy', text });
    });
    els.clear.addEventListener('click', () => {
      vscode.postMessage({ type: 'clear', sourceId: state.activeSourceId });
      state.textBySource.set(state.activeSourceId, '');
      render();
    });

    window.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey)) {
        if (e.key === 'Escape') {
          const had = (els.filter.value || '').length > 0;
          if (had) {
            e.preventDefault();
            els.filter.value = '';
            render();
            return;
          }
          if (document.activeElement === els.filter) {
            e.preventDefault();
            els.filter.blur();
          }
        }
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        els.filter.focus();
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        els.clear.click();
        return;
      }
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || !msg.type) return;

      if (msg.type === 'init') {
        setLoading(false, '');
        state.runId = msg.runId;
        state.sources = msg.sources || [];
        els.runId.textContent = msg.runId || '';
        els.title.textContent = 'Babysitter Logs';
        els.sourceSelect.innerHTML = '';
        for (const src of state.sources) {
          const opt = document.createElement('option');
          opt.value = src.id;
          opt.textContent = src.label;
          els.sourceSelect.appendChild(opt);
          if (!state.textBySource.has(src.id)) state.textBySource.set(src.id, '');
        }
        els.sourceSelect.value = msg.activeSourceId || 'process';
        setActiveSource(els.sourceSelect.value);
      } else if (msg.type === 'set') {
        state.textBySource.set(msg.sourceId, msg.text || '');
        if (msg.sourceId === state.activeSourceId) render();
      } else if (msg.type === 'append') {
        const prev = state.textBySource.get(msg.sourceId) || '';
        state.textBySource.set(msg.sourceId, prev + (msg.text || ''));
        if (msg.sourceId === state.activeSourceId) render();
      } else if (msg.type === 'status') {
        setStatus(msg.text || '');
      }
    });

    setLoading(true, 'Initializing...');
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

function trimToMaxChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(-maxChars);
}

function seedTextTailerFromEnd(params: {
  tailer: TextFileTailer;
  filePath: string;
  maxBytes: number;
}): string {
  let stat: fs.Stats | undefined;
  try {
    stat = fs.statSync(params.filePath);
  } catch {
    return '';
  }
  const start = Math.max(0, stat.size - Math.max(0, params.maxBytes));
  params.tailer.seek(start);
  const seeded = params.tailer.tail(params.filePath);
  if (seeded.lines.length === 0) return '';
  return `${seeded.lines.join('\n')}\n`;
}

function findLatestRegularFile(candidates: string[]): string | undefined {
  type Candidate = { fsPath: string; mtimeMs: number };
  const found: Candidate[] = [];
  for (const dirPath of candidates) {
    let dirents: fs.Dirent[];
    try {
      dirents = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const d of dirents) {
      if (!d.isFile()) continue;
      const fsPath = path.join(dirPath, d.name);
      try {
        const stat = fs.statSync(fsPath);
        if (!stat.isFile()) continue;
        found.push({ fsPath, mtimeMs: stat.mtimeMs });
      } catch {
        // ignore
      }
    }
  }
  found.sort((a, b) => {
    if (a.mtimeMs !== b.mtimeMs) return b.mtimeMs - a.mtimeMs;
    return a.fsPath.localeCompare(b.fsPath);
  });
  return found[0]?.fsPath;
}

class RunLogsPanel {
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly journalTailer = new TextFileTailer();
  private readonly workSummaryTailer = new TextFileTailer();
  private ready = false;

  private processText = '';
  private journalText = '';
  private workSummaryText = '';
  private workSummaryFsPath: string | undefined;

  private readonly maxChars: number;

  constructor(
    private readonly run: Run,
    private readonly deps: {
      context: vscode.ExtensionContext;
      interactions: OProcessInteractionTracker;
      output: vscode.OutputChannel;
      onDispose?: () => void;
    },
    options?: { maxChars?: number },
  ) {
    this.maxChars = options?.maxChars ?? 200_000;

    this.panel = vscode.window.createWebviewPanel(
      'babysitter.runLogs',
      `Run Logs: ${run.id}`,
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    this.panel.webview.html = renderWebviewHtml(this.panel.webview);

    this.disposables.push(
      this.panel.onDidDispose(() => {
        try {
          this.deps.onDispose?.();
        } finally {
          this.dispose();
        }
      }),
      this.panel.webview.onDidReceiveMessage(
        (msg: WebviewInboundMessage) => void this.onMessage(msg),
      ),
    );

    const disposeOutput = this.deps.interactions.onDidOutput((evt) => {
      if (evt.runId !== this.run.id) return;
      this.append('process', evt.chunk);
    });
    this.disposables.push(new vscode.Disposable(disposeOutput));
  }

  private async post(message: WebviewOutboundMessage): Promise<void> {
    if (!this.ready) return;
    try {
      await this.panel.webview.postMessage(message);
    } catch {
      // ignore
    }
  }

  private async initIfNeeded(): Promise<void> {
    if (this.ready) return;

    const sources: Array<{ id: LogSourceId; label: string }> = [
      { id: 'process', label: 'o output' },
      { id: 'journal', label: 'journal.jsonl' },
      { id: 'workSummaryLatest', label: 'latest work summary (tail)' },
    ];

    this.processText = this.deps.interactions.getOutputTailForRunId(this.run.id) ?? '';
    this.journalText = seedTextTailerFromEnd({
      tailer: this.journalTailer,
      filePath: this.run.paths.journalJsonl,
      maxBytes: 64 * 1024,
    });
    this.workSummaryFsPath = findLatestRegularFile([
      this.run.paths.workSummariesDir,
      path.join(this.run.paths.runRoot, 'run', 'work_summaries'),
    ]);
    this.workSummaryText = this.workSummaryFsPath
      ? seedTextTailerFromEnd({
          tailer: this.workSummaryTailer,
          filePath: this.workSummaryFsPath,
          maxBytes: 64 * 1024,
        })
      : '';

    this.ready = true;

    await this.post({ type: 'init', runId: this.run.id, sources, activeSourceId: 'process' });
    await this.post({ type: 'set', sourceId: 'process', text: this.processText });
    await this.post({ type: 'set', sourceId: 'journal', text: this.journalText });
    await this.post({ type: 'set', sourceId: 'workSummaryLatest', text: this.workSummaryText });
  }

  private async onMessage(msg: WebviewInboundMessage): Promise<void> {
    if (msg.type === 'ready') {
      await this.initIfNeeded();
      return;
    }

    await this.initIfNeeded();

    if (msg.type === 'copy') {
      await vscode.env.clipboard.writeText(msg.text ?? '');
      await this.post({ type: 'status', text: 'Copied to clipboard.' });
      return;
    }

    if (msg.type === 'clear') {
      if (msg.sourceId === 'process') {
        this.processText = '';
      } else if (msg.sourceId === 'journal') {
        this.journalText = '';
        try {
          const stat = fs.statSync(this.run.paths.journalJsonl);
          this.journalTailer.seek(stat.size);
        } catch {
          this.journalTailer.reset();
        }
      } else if (msg.sourceId === 'workSummaryLatest') {
        this.workSummaryText = '';
        if (this.workSummaryFsPath) {
          try {
            const stat = fs.statSync(this.workSummaryFsPath);
            this.workSummaryTailer.seek(stat.size);
          } catch {
            this.workSummaryTailer.reset();
          }
        } else {
          this.workSummaryTailer.reset();
        }
      }
      await this.post({ type: 'status', text: 'Cleared.' });
      return;
    }
  }

  private append(sourceId: LogSourceId, text: string): void {
    if (sourceId === 'process') {
      this.processText = trimToMaxChars(`${this.processText}${text}`, this.maxChars);
    } else if (sourceId === 'journal') {
      this.journalText = trimToMaxChars(`${this.journalText}${text}`, this.maxChars);
    } else if (sourceId === 'workSummaryLatest') {
      this.workSummaryText = trimToMaxChars(`${this.workSummaryText}${text}`, this.maxChars);
    }
    void this.post({ type: 'append', sourceId, text });
  }

  onRunChangeBatch(batch: RunChangeBatch): void {
    if (!batch.runIds.includes(this.run.id)) return;
    const areas = batch.areasByRunId.get(this.run.id);
    if (!areas) return;

    if (areas.has('journal')) {
      const tail = this.journalTailer.tail(this.run.paths.journalJsonl);
      if (tail.lines.length > 0) this.append('journal', `${tail.lines.join('\n')}\n`);
    }

    if (areas.has('workSummaries')) {
      const latest = findLatestRegularFile([
        this.run.paths.workSummariesDir,
        path.join(this.run.paths.runRoot, 'run', 'work_summaries'),
      ]);
      if (latest && latest !== this.workSummaryFsPath) {
        this.workSummaryFsPath = latest;
        this.workSummaryText = seedTextTailerFromEnd({
          tailer: this.workSummaryTailer,
          filePath: latest,
          maxBytes: 64 * 1024,
        });
        void this.post({ type: 'set', sourceId: 'workSummaryLatest', text: this.workSummaryText });
        return;
      }

      if (this.workSummaryFsPath) {
        const tail = this.workSummaryTailer.tail(this.workSummaryFsPath);
        if (tail.lines.length > 0) this.append('workSummaryLatest', `${tail.lines.join('\n')}\n`);
      }
    }
  }

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.Beside);
  }

  dispose(): void {
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}

export function createRunLogsViewManager(
  context: vscode.ExtensionContext,
  deps: { interactions: OProcessInteractionTracker; output: vscode.OutputChannel },
): { open: (run: Run) => void; onRunChangeBatch: (batch: RunChangeBatch) => void } {
  const panelsByRunId = new Map<string, RunLogsPanel>();

  const open = (run: Run): void => {
    const existing = panelsByRunId.get(run.id);
    if (existing) {
      existing.reveal();
      return;
    }

    const panel = new RunLogsPanel(run, {
      context,
      ...deps,
      onDispose: () => panelsByRunId.delete(run.id),
    });
    panelsByRunId.set(run.id, panel);
  };

  const onRunChangeBatch = (batch: RunChangeBatch): void => {
    for (const runId of batch.runIds) panelsByRunId.get(runId)?.onRunChangeBatch(batch);
  };

  return { open, onRunChangeBatch };
}
