import * as fs from 'fs';
import * as path from 'path';

import { resolveOBinaryPath, type ResolvedOBinary } from './oBinary';

export type BabysitterResolvedOBinary = Omit<ResolvedOBinary, 'source'> & {
  source: ResolvedOBinary['source'] | 'globalConfig';
};

export type BabysitterRawSettings = {
  /**
   * Preferred setting: optional full path to the `o` executable (or a directory containing it).
   */
  oBinaryPath?: string;
  /**
   * Legacy setting retained for backward compatibility.
   */
  oPath?: string;
  /**
   * Runs root path. If relative, it is resolved from the workspace root.
   */
  runsRoot?: string;
  /**
   * Optional path to a JSON global config file.
   */
  globalConfigPath?: string;
};

export type BabysitterGlobalConfig = {
  oBinaryPath?: unknown;
  runsRoot?: unknown;
};

export type ConfigIssue = {
  code:
    | 'NO_WORKSPACE'
    | 'GLOBAL_CONFIG_NOT_FOUND'
    | 'GLOBAL_CONFIG_INVALID_JSON'
    | 'GLOBAL_CONFIG_INVALID_SHAPE'
    | 'O_BINARY_NOT_FOUND'
    | 'RUNS_ROOT_NOT_A_DIRECTORY';
  message: string;
  detail?: string;
};

export type BabysitterResolvedConfig = {
  oBinary?: BabysitterResolvedOBinary;
  runsRoot?: { path: string; source: 'setting' | 'globalConfig' | 'default' };
  globalConfigPath?: string;
};

export type ResolveConfigOptions = {
  settings: BabysitterRawSettings;
  workspaceRoot?: string;
  envPath?: string;
  platform?: NodeJS.Platform;
};

export type ResolveConfigResult = {
  config: BabysitterResolvedConfig;
  issues: ConfigIssue[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveRunsRootPath(
  runsRoot: string,
  workspaceRoot: string | undefined,
): string | undefined {
  const trimmed = runsRoot.trim();
  if (!trimmed) return undefined;
  if (path.isAbsolute(trimmed)) return trimmed;
  if (!workspaceRoot) return undefined;
  return path.join(workspaceRoot, trimmed);
}

function validateRunsRootDirectory(runsRootPath: string): ConfigIssue | undefined {
  try {
    const stat = fs.statSync(runsRootPath);
    if (!stat.isDirectory()) {
      return {
        code: 'RUNS_ROOT_NOT_A_DIRECTORY',
        message: 'Runs root exists but is not a directory.',
        detail: runsRootPath,
      };
    }
  } catch {
    // Non-existent is allowed: it will be created by `o` when dispatching runs.
  }
  return undefined;
}

export function readGlobalConfig(configPath: string): {
  config?: { oBinaryPath?: string; runsRoot?: string };
  issues: ConfigIssue[];
} {
  const issues: ConfigIssue[] = [];
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      issues.push({
        code: 'GLOBAL_CONFIG_INVALID_JSON',
        message: 'Global config is not valid JSON.',
        detail: message,
      });
      return { issues };
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      issues.push({
        code: 'GLOBAL_CONFIG_INVALID_SHAPE',
        message: 'Global config must be a JSON object.',
      });
      return { issues };
    }

    const obj = parsed as BabysitterGlobalConfig;
    const cfg: { oBinaryPath?: string; runsRoot?: string } = {};

    if (obj.oBinaryPath !== undefined) {
      if (!isNonEmptyString(obj.oBinaryPath)) {
        issues.push({
          code: 'GLOBAL_CONFIG_INVALID_SHAPE',
          message: 'Global config field `oBinaryPath` must be a non-empty string.',
        });
      } else {
        cfg.oBinaryPath = obj.oBinaryPath.trim();
      }
    }

    if (obj.runsRoot !== undefined) {
      if (!isNonEmptyString(obj.runsRoot)) {
        issues.push({
          code: 'GLOBAL_CONFIG_INVALID_SHAPE',
          message: 'Global config field `runsRoot` must be a non-empty string.',
        });
      } else {
        cfg.runsRoot = obj.runsRoot.trim();
      }
    }

    return issues.length > 0 ? { issues } : { config: cfg, issues };
  } catch (err) {
    if ((err as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
      issues.push({
        code: 'GLOBAL_CONFIG_NOT_FOUND',
        message: 'Global config file does not exist.',
        detail: configPath,
      });
      return { issues };
    }
    const message = err instanceof Error ? err.message : String(err);
    issues.push({
      code: 'GLOBAL_CONFIG_INVALID_JSON',
      message: 'Failed to read global config file.',
      detail: message,
    });
    return { issues };
  }
}

export function resolveBabysitterConfig(options: ResolveConfigOptions): ResolveConfigResult {
  const platform = options.platform ?? process.platform;

  const issues: ConfigIssue[] = [];
  const settings = options.settings;
  const globalConfigPath = isNonEmptyString(settings.globalConfigPath)
    ? settings.globalConfigPath.trim()
    : undefined;

  const globalConfigResult =
    globalConfigPath !== undefined
      ? readGlobalConfig(globalConfigPath)
      : { issues: [] as ConfigIssue[] };
  issues.push(...globalConfigResult.issues);

  const globalConfig = globalConfigResult.config;

  const effectiveConfiguredOBinaryPath =
    (isNonEmptyString(settings.oBinaryPath) ? settings.oBinaryPath.trim() : undefined) ??
    (isNonEmptyString(settings.oPath) ? settings.oPath.trim() : undefined) ??
    globalConfig?.oBinaryPath;

  const oBinaryResolveOptions: Parameters<typeof resolveOBinaryPath>[0] = { platform };
  if (effectiveConfiguredOBinaryPath !== undefined) {
    oBinaryResolveOptions.configuredPath = effectiveConfiguredOBinaryPath;
  }
  if (options.workspaceRoot !== undefined) {
    oBinaryResolveOptions.workspaceRoot = options.workspaceRoot;
  }
  if (options.envPath !== undefined) {
    oBinaryResolveOptions.envPath = options.envPath;
  }

  const resolvedOBinary = resolveOBinaryPath(oBinaryResolveOptions);

  const resolvedConfig: BabysitterResolvedConfig = {};
  if (globalConfigPath !== undefined) resolvedConfig.globalConfigPath = globalConfigPath;

  if (!resolvedOBinary) {
    issues.push({
      code: 'O_BINARY_NOT_FOUND',
      message:
        'Could not find the `o` binary. Set Babysitter settings, place `o` in the workspace root, or add it to PATH.',
    });
  } else {
    const oBinarySource: BabysitterResolvedOBinary['source'] =
      globalConfig?.oBinaryPath !== undefined &&
      globalConfig.oBinaryPath === effectiveConfiguredOBinaryPath
        ? 'globalConfig'
        : resolvedOBinary.source;
    resolvedConfig.oBinary = { path: resolvedOBinary.path, source: oBinarySource };
  }

  const rawRunsRoot =
    (isNonEmptyString(settings.runsRoot) ? settings.runsRoot.trim() : undefined) ??
    globalConfig?.runsRoot ??
    '.a5c/runs';
  const resolvedRunsRoot = resolveRunsRootPath(rawRunsRoot, options.workspaceRoot);

  if (!resolvedRunsRoot) {
    issues.push({
      code: 'NO_WORKSPACE',
      message: 'A workspace folder is required to resolve relative paths such as the runs root.',
      detail: `runsRoot=${rawRunsRoot}`,
    });
  } else {
    const runsRootIssue = validateRunsRootDirectory(resolvedRunsRoot);
    if (runsRootIssue) issues.push(runsRootIssue);

    const runsRootSource: NonNullable<BabysitterResolvedConfig['runsRoot']>['source'] =
      isNonEmptyString(settings.runsRoot)
        ? 'setting'
        : globalConfig?.runsRoot
          ? 'globalConfig'
          : 'default';
    resolvedConfig.runsRoot = { path: resolvedRunsRoot, source: runsRootSource };
  }

  return {
    config: resolvedConfig,
    issues,
  };
}
