import * as path from 'path';
import * as vscode from 'vscode';

import { JournalTailer } from '../core/journal';
import type { Run } from '../core/run';
import type { RunChangeBatch } from '../core/runFileChanges';
import {
  isFsPathInsideRoot,
  readRunDetailsSnapshot,
  readTextFileWithLimit,
  type RunDetailsSnapshot,
} from '../core/runDetailsSnapshot';

type WebviewInboundMessage =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'openInEditor'; fsPath: string }
  | { type: 'revealInExplorer'; fsPath: string }
  | { type: 'loadTextFile'; fsPath: string };

type WebviewOutboundMessage =
  | { type: 'snapshot'; snapshot: RunDetailsSnapshot }
  | { type: 'textFile'; fsPath: string; content: string; truncated: boolean; size: number }
  | { type: 'error'; message: string };

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
  <title>Babysitter Run</title>
  <style>
    :root {
      --pad: 14px;
      --card: var(--vscode-editorWidget-background);
      --border: var(--vscode-editorWidget-border);
      --muted: var(--vscode-descriptionForeground);
      --shadow: rgba(0,0,0,.12);
      --accent: var(--vscode-button-background);
      --accentText: var(--vscode-button-foreground);
    }
    body {
      padding: 0;
      margin: 0;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
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
      font-size: 16px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .subtitle {
      color: var(--muted);
      font-size: 12px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
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
    main {
      padding: var(--pad);
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--pad);
    }
    .grid2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--pad);
    }
    @media (max-width: 920px) {
      .grid2 { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 1px 0 var(--shadow);
      padding: 12px;
      overflow: hidden;
    }
    .card h2 {
      margin: 0 0 10px 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .meta {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 6px 10px;
      font-size: 12px;
    }
    .key { color: var(--muted); }
    .value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--vscode-editor-font-family);
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 340px;
      overflow: auto;
      padding-right: 4px;
    }
    .item {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      justify-content: space-between;
      background: var(--vscode-editor-background);
    }
    .item .left { min-width: 0; flex: 1; }
    .item .name {
      font-size: 12px;
      font-family: var(--vscode-editor-font-family);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item .hint { color: var(--muted); font-size: 11px; margin-top: 2px; }
    .actions { display: flex; gap: 6px; align-items: center; }
    .pill {
      display: inline-flex;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 1px 8px;
      color: var(--muted);
      font-size: 11px;
    }
    pre {
      margin: 0;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--vscode-textCodeBlock-background);
      overflow: auto;
      max-height: 340px;
      font-size: 11px;
      line-height: 1.4;
      font-family: var(--vscode-editor-font-family);
    }
    .empty { color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <div class="title">
      <h1 id="runTitle">Babysitter Run</h1>
      <div class="subtitle" id="runSubtitle"></div>
    </div>
    <div class="actions">
      <button id="refreshBtn" class="primary">Refresh</button>
    </div>
  </header>

  <main>
    <div class="grid2">
      <section class="card">
        <h2>Run</h2>
        <div class="meta" id="runMeta"></div>
      </section>
      <section class="card">
        <h2>State</h2>
        <div id="stateIssues" class="empty" style="margin-bottom: 8px; display:none;"></div>
        <pre id="stateJson">{}</pre>
      </section>
    </div>

    <div class="grid2">
      <section class="card">
        <h2>
          Latest Events
          <span class="pill" id="journalPill"></span>
        </h2>
        <div id="journalErrors" class="empty" style="margin-bottom: 8px; display:none;"></div>
        <pre id="journalJson">[]</pre>
      </section>
      <section class="card">
        <h2>
          Work Summaries
          <span class="pill" id="workPill"></span>
        </h2>
        <div class="list" id="workList"></div>
        <div style="margin-top: 10px;">
          <pre id="workPreview" style="display:none;"></pre>
          <div id="workEmpty" class="empty">No work summaries found.</div>
        </div>
      </section>
    </div>

    <section class="card">
      <h2>
        Artifacts
        <span class="pill" id="artifactsPill"></span>
      </h2>
      <div class="list" id="artifactsList"></div>
      <div id="artifactsEmpty" class="empty">No artifacts found.</div>
    </section>
  </main>

  <script nonce="${scriptNonce}">
    const vscode = acquireVsCodeApi();

    const el = (id) => document.getElementById(id);
    const runTitle = el('runTitle');
    const runSubtitle = el('runSubtitle');
    const runMeta = el('runMeta');
    const stateJson = el('stateJson');
    const stateIssues = el('stateIssues');
    const journalJson = el('journalJson');
    const journalErrors = el('journalErrors');
    const journalPill = el('journalPill');
    const workList = el('workList');
    const workPreview = el('workPreview');
    const workEmpty = el('workEmpty');
    const workPill = el('workPill');
    const artifactsList = el('artifactsList');
    const artifactsEmpty = el('artifactsEmpty');
    const artifactsPill = el('artifactsPill');
    const refreshBtn = el('refreshBtn');

    refreshBtn.addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'snapshot') {
        renderSnapshot(msg.snapshot);
        return;
      }
      if (msg.type === 'textFile') {
        renderTextFile(msg);
        return;
      }
      if (msg.type === 'error') {
        runSubtitle.textContent = msg.message;
      }
    });

    function addMetaRow(key, value) {
      const k = document.createElement('div');
      k.className = 'key';
      k.textContent = key;
      const v = document.createElement('div');
      v.className = 'value';
      v.textContent = value || '';
      runMeta.appendChild(k);
      runMeta.appendChild(v);
    }

    function formatBytes(bytes) {
      if (bytes == null) return '';
      if (bytes < 1024) return bytes + ' B';
      const kb = bytes / 1024;
      if (kb < 1024) return kb.toFixed(1) + ' KB';
      const mb = kb / 1024;
      if (mb < 1024) return mb.toFixed(1) + ' MB';
      const gb = mb / 1024;
      return gb.toFixed(1) + ' GB';
    }

    function renderSnapshot(snapshot) {
      runTitle.textContent = snapshot.run.id;
      runSubtitle.innerHTML = '';
      const status = document.createElement('span');
      status.className = 'pill';
      status.textContent = snapshot.run.status;
      runSubtitle.appendChild(status);
      const updated = document.createElement('span');
      updated.textContent = 'Updated: ' + new Date(snapshot.run.timestamps.updatedAt).toLocaleString();
      runSubtitle.appendChild(updated);

      runMeta.innerHTML = '';
      addMetaRow('Run root', snapshot.run.paths.runRoot);
      addMetaRow('State', snapshot.run.paths.stateJson);
      addMetaRow('Journal', snapshot.run.paths.journalJsonl);
      addMetaRow('Artifacts', snapshot.run.paths.artifactsDir);
      addMetaRow('Work summaries', snapshot.run.paths.workSummariesDir);
      addMetaRow('Created', new Date(snapshot.run.timestamps.createdAt).toLocaleString());

      const issues = snapshot.state.issues || [];
      if (issues.length > 0) {
        stateIssues.style.display = '';
        stateIssues.textContent = issues.map((i) => '[' + i.code + '] ' + i.message).join('  •  ');
      } else {
        stateIssues.style.display = 'none';
        stateIssues.textContent = '';
      }
      stateJson.textContent = JSON.stringify(snapshot.state.state || {}, null, 2);

      const journal = snapshot.journal;
      journalPill.textContent = (journal.entries?.length || 0) + ' entries';
      journalJson.textContent = JSON.stringify(journal.entries || [], null, 2);
      const jErrors = journal.errors || [];
      if (jErrors.length > 0) {
        journalErrors.style.display = '';
        journalErrors.textContent = jErrors.slice(0, 2).map((e) => 'Line ' + e.line + ': ' + e.message).join('  •  ');
      } else {
        journalErrors.style.display = 'none';
        journalErrors.textContent = '';
      }

      renderWorkSummaries(snapshot.workSummaries || []);
      renderArtifacts(snapshot.artifacts || []);
    }

    function renderWorkSummaries(items) {
      workPill.textContent = items.length + ' files';
      workList.innerHTML = '';
      workPreview.style.display = 'none';
      workPreview.textContent = '';

      if (items.length === 0) {
        workEmpty.style.display = '';
        return;
      }
      workEmpty.style.display = 'none';

      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'item';

        const left = document.createElement('div');
        left.className = 'left';

        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = item.relPath;
        left.appendChild(name);

        const hint = document.createElement('div');
        hint.className = 'hint';
        const size = item.size != null ? formatBytes(item.size) : '';
        hint.textContent = [size].filter(Boolean).join(' • ');
        left.appendChild(hint);

        const actions = document.createElement('div');
        actions.className = 'actions';

        const previewBtn = document.createElement('button');
        previewBtn.textContent = 'Preview';
        previewBtn.addEventListener('click', () => vscode.postMessage({ type: 'loadTextFile', fsPath: item.fsPath }));

        const openBtn = document.createElement('button');
        openBtn.textContent = 'Open';
        openBtn.addEventListener('click', () => vscode.postMessage({ type: 'openInEditor', fsPath: item.fsPath }));

        actions.appendChild(previewBtn);
        actions.appendChild(openBtn);

        row.appendChild(left);
        row.appendChild(actions);
        workList.appendChild(row);
      }
    }

    function renderArtifacts(items) {
      artifactsPill.textContent = items.length + ' items';
      artifactsList.innerHTML = '';

      if (items.length === 0) {
        artifactsEmpty.style.display = '';
        return;
      }
      artifactsEmpty.style.display = 'none';

      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'item';

        const left = document.createElement('div');
        left.className = 'left';

        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = item.relPath + (item.isDirectory ? '/' : '');
        left.appendChild(name);

        const hint = document.createElement('div');
        hint.className = 'hint';
        const size = item.isDirectory ? 'Folder' : (item.size != null ? formatBytes(item.size) : '');
        hint.textContent = size;
        left.appendChild(hint);

        const actions = document.createElement('div');
        actions.className = 'actions';

        const revealBtn = document.createElement('button');
        revealBtn.textContent = 'Reveal';
        revealBtn.addEventListener('click', () => vscode.postMessage({ type: 'revealInExplorer', fsPath: item.fsPath }));
        actions.appendChild(revealBtn);

        if (!item.isDirectory) {
          const openBtn = document.createElement('button');
          openBtn.textContent = 'Open';
          openBtn.addEventListener('click', () => vscode.postMessage({ type: 'openInEditor', fsPath: item.fsPath }));
          actions.appendChild(openBtn);
        }

        row.appendChild(left);
        row.appendChild(actions);
        artifactsList.appendChild(row);
      }
    }

    function renderTextFile(msg) {
      if (!msg || typeof msg.content !== 'string') return;
      workPreview.style.display = '';
      const suffix = msg.truncated ? '\\n\\n… (truncated)' : '';
      workPreview.textContent = msg.content + suffix;
      workPreview.scrollTop = 0;
    }

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

class RunDetailsPanel {
  private readonly panel: vscode.WebviewPanel;
  private readonly run: Run;
  private readonly journalTailer = new JournalTailer();
  private journalEntries: unknown[] = [];

  private readonly disposables: vscode.Disposable[] = [];

  constructor(params: { extensionUri: vscode.Uri; run: Run; onDisposed: () => void }) {
    this.run = params.run;
    this.panel = vscode.window.createWebviewPanel(
      'babysitter.runDetails',
      `Run ${params.run.id}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [params.extensionUri],
      },
    );

    this.panel.webview.html = renderWebviewHtml(this.panel.webview);

    this.disposables.push(
      this.panel.onDidDispose(() => {
        params.onDisposed();
        this.dispose();
      }),
      this.panel.webview.onDidReceiveMessage((msg: WebviewInboundMessage) => {
        void this.onMessage(msg);
      }),
    );
  }

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.Active);
  }

  dispose(): void {
    for (const d of this.disposables.splice(0)) d.dispose();
  }

  private async onMessage(msg: WebviewInboundMessage): Promise<void> {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.type) {
      case 'ready':
      case 'refresh':
        await this.refresh();
        return;
      case 'openInEditor':
        await this.openInEditor(msg.fsPath);
        return;
      case 'revealInExplorer':
        await this.revealInExplorer(msg.fsPath);
        return;
      case 'loadTextFile':
        await this.loadTextFile(msg.fsPath);
        return;
      default:
        return;
    }
  }

  private async post(message: WebviewOutboundMessage): Promise<void> {
    try {
      await this.panel.webview.postMessage(message);
    } catch {
      // ignore
    }
  }

  async refresh(): Promise<void> {
    try {
      const { snapshot, nextJournalEntries } = readRunDetailsSnapshot({
        run: this.run,
        journalTailer: this.journalTailer,
        existingJournalEntries: this.journalEntries,
        maxJournalEntries: 30,
        maxArtifacts: 500,
        maxWorkSummaries: 50,
      });
      this.journalEntries = nextJournalEntries;
      await this.post({ type: 'snapshot', snapshot });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.post({ type: 'error', message: `Failed to refresh run details: ${message}` });
    }
  }

  private async openInEditor(fsPath: string): Promise<void> {
    if (!isFsPathInsideRoot(this.run.paths.runRoot, fsPath)) {
      await this.post({ type: 'error', message: 'Refusing to open a file outside the run directory.' });
      return;
    }
    try {
      await vscode.window.showTextDocument(vscode.Uri.file(fsPath), { preview: true });
    } catch {
      await this.post({ type: 'error', message: `Could not open: ${path.basename(fsPath)}` });
    }
  }

  private async revealInExplorer(fsPath: string): Promise<void> {
    if (!isFsPathInsideRoot(this.run.paths.runRoot, fsPath)) return;
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(fsPath));
  }

  private async loadTextFile(fsPath: string): Promise<void> {
    if (!isFsPathInsideRoot(this.run.paths.runRoot, fsPath)) return;
    try {
      const res = readTextFileWithLimit(fsPath, 200_000);
      await this.post({ type: 'textFile', fsPath, content: res.content, truncated: res.truncated, size: res.size });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.post({ type: 'error', message: `Could not read file: ${message}` });
    }
  }
}

export function createRunDetailsViewManager(context: vscode.ExtensionContext): {
  open: (run: Run) => Promise<void>;
  onRunChangeBatch: (batch: RunChangeBatch) => void;
} {
  const panelsByRunId = new Map<string, RunDetailsPanel>();

  const open = async (run: Run): Promise<void> => {
    const existing = panelsByRunId.get(run.id);
    if (existing) {
      existing.reveal();
      await existing.refresh();
      return;
    }

    const panel = new RunDetailsPanel({
      extensionUri: context.extensionUri,
      run,
      onDisposed: () => {
        panelsByRunId.delete(run.id);
      },
    });
    panelsByRunId.set(run.id, panel);
    context.subscriptions.push(panel);
    await panel.refresh();
  };

  const onRunChangeBatch = (batch: RunChangeBatch): void => {
    for (const runId of batch.runIds) {
      const panel = panelsByRunId.get(runId);
      if (panel) void panel.refresh();
    }
  };

  return { open, onRunChangeBatch };
}
