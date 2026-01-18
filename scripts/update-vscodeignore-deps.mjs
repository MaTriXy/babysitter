#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const extensionRoot = path.join(repoRoot, 'packages', 'vscode-extension');
const vscodeIgnorePath = path.join(extensionRoot, '.vscodeignore');
const startMarker = '# BEGIN auto-generated dependency allowlist';
const endMarker = '# END auto-generated dependency allowlist';
const excludedScopes = new Set(['@a5c']);

function isExcluded(name) {
  if (!name) {
    return true;
  }
  if (name.startsWith('@')) {
    const scope = name.split('/')[0];
    return excludedScopes.has(scope);
  }
  return false;
}

function collectDependencies(tree) {
  const result = new Set();
  const stack = [tree?.dependencies ?? {}];
  while (stack.length) {
    const deps = stack.pop();
    for (const [name, info] of Object.entries(deps)) {
      if (isExcluded(name)) {
        continue;
      }
      result.add(name);
      if (info && info.dependencies) {
        stack.push(info.dependencies);
      }
    }
  }
  return result;
}

function buildAllowlist() {
  const raw = execSync('npm ls --production --all --json', {
    cwd: extensionRoot,
    stdio: ['ignore', 'pipe', 'inherit'],
  }).toString();
  const data = JSON.parse(raw);
  const names = collectDependencies(data);
  const filtered = [...names].filter((name) => !isExcluded(name));
  const patterns = new Set();
  for (const name of filtered) {
    if (name.startsWith('@')) {
      const [scope, pkg] = name.split('/');
      if (!pkg) {
        continue;
      }
      patterns.add(`!node_modules/${scope}/${pkg}/**`);
    } else {
      patterns.add(`!node_modules/${name}/**`);
    }
  }
  return [...patterns].sort();
}

function updateFile(patterns) {
  const contents = fs.readFileSync(vscodeIgnorePath, 'utf8');
  const startIndex = contents.indexOf(startMarker);
  const endIndex = contents.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error('Could not find dependency allowlist markers in .vscodeignore');
  }
  const before = contents.slice(0, startIndex + startMarker.length);
  const after = contents.slice(endIndex);
  const block = [''].concat(patterns).concat(['']).join('\n');
  const updated = `${before}\n${block}${after}`;
  fs.writeFileSync(vscodeIgnorePath, updated, 'utf8');
}

try {
  const patterns = buildAllowlist();
  updateFile(patterns);
  console.log(`Updated .vscodeignore with ${patterns.length} dependency patterns.`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
