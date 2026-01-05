import * as fs from 'fs';
import * as path from 'path';

export type ResolvedOBinary = {
  path: string;
  source: 'setting' | 'workspace' | 'path';
};

type ResolveOBinaryOptions = {
  configuredPath?: string;
  workspaceRoot?: string;
  envPath?: string;
  platform?: NodeJS.Platform;
};

function splitPathEnv(envPath: string, platform: NodeJS.Platform): string[] {
  const delimiter = platform === 'win32' ? ';' : ':';
  return envPath
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function candidateBinaryNames(platform: NodeJS.Platform): string[] {
  if (platform === 'win32') {
    return ['o.exe', 'o.cmd', 'o.bat', 'o'];
  }
  return ['o'];
}

function isExistingFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveFromDirectory(dirPath: string, platform: NodeJS.Platform): string | undefined {
  for (const name of candidateBinaryNames(platform)) {
    const candidate = path.join(dirPath, name);
    if (isExistingFile(candidate)) return candidate;
  }
  return undefined;
}

function resolveFromConfiguredPath(
  configuredPath: string,
  platform: NodeJS.Platform,
): string | undefined {
  const trimmed = configuredPath.trim();
  if (!trimmed) return undefined;

  try {
    const stat = fs.statSync(trimmed);
    if (stat.isFile()) return trimmed;
    if (stat.isDirectory()) return resolveFromDirectory(trimmed, platform);
  } catch {
    return undefined;
  }

  return undefined;
}

export function resolveOBinaryPath(options: ResolveOBinaryOptions): ResolvedOBinary | undefined {
  const platform = options.platform ?? process.platform;

  if (options.configuredPath) {
    const resolved = resolveFromConfiguredPath(options.configuredPath, platform);
    if (resolved) return { path: resolved, source: 'setting' };
  }

  if (options.workspaceRoot) {
    const resolved = resolveFromDirectory(options.workspaceRoot, platform);
    if (resolved) return { path: resolved, source: 'workspace' };
  }

  if (options.envPath) {
    const pathEntries = splitPathEnv(options.envPath, platform);
    for (const entry of pathEntries) {
      const resolved = resolveFromDirectory(entry, platform);
      if (resolved) return { path: resolved, source: 'path' };
    }
  }

  return undefined;
}
