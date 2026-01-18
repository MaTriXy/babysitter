import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

export type ProcessExportKind =
  | 'core'
  | 'loop'
  | 'role'
  | 'aspect'
  | 'recipe'
  | 'domain'
  | 'shared'
  | 'unknown';

export type ProcessParam = {
  name: string;
  hasDefault: boolean;
  isRest: boolean;
};

export type ProcessExport = {
  id: string;
  modulePath: string;
  exportName: string;
  kind: ProcessExportKind;
  params: ProcessParam[];
  doc?: string;
  returnKeys?: string[];
  filePath: string;
};

export type ProcessCatalog = {
  version: 1;
  generatedAt: string;
  processesRootPath: string;
  exports: ProcessExport[];
};

export function determineProcessKind(modulePath: string): ProcessExportKind {
  const normalized = modulePath.replace(/\\/g, '/');
  if (normalized.includes('/core/loops/')) return 'loop';
  if (normalized.startsWith('.a5c/processes/core/')) return 'core';
  if (normalized.includes('/roles/development/aspects/')) return 'aspect';
  if (normalized.includes('/roles/development/recipes/')) return 'recipe';
  if (normalized.includes('/roles/development/domains/packs/')) return 'domain';
  if (normalized.includes('/shared/')) return 'shared';
  if (normalized.startsWith('.a5c/processes/roles/')) return 'role';
  return 'unknown';
}

function cleanDocComment(raw: string): string {
  const lines = raw
    .replace(/^\/\*\*?/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trimEnd());
  const cleaned = lines.join('\n').trim();
  return cleaned;
}

function getLeadingDocComment(sourceText: string, node: ts.Node): string | undefined {
  const ranges = ts.getLeadingCommentRanges(sourceText, node.getFullStart());
  if (!ranges || ranges.length === 0) return undefined;
  const last = ranges[ranges.length - 1];
  if (!last) return undefined;
  const raw = sourceText.slice(last.pos, last.end);
  if (!raw.startsWith('/**')) return undefined;
  const cleaned = cleanDocComment(raw);
  return cleaned ? cleaned : undefined;
}

function stringifyNode(sourceFile: ts.SourceFile, node: ts.Node): string {
  return node.getText(sourceFile);
}

function getReturnKeysFromFunctionBody(
  sourceFile: ts.SourceFile,
  body: ts.ConciseBody,
): string[] | undefined {
  const keys = new Set<string>();

  const addObjectKeys = (obj: ts.ObjectLiteralExpression): void => {
    for (const prop of obj.properties) {
      if (ts.isSpreadAssignment(prop)) continue;
      if (
        ts.isPropertyAssignment(prop) ||
        ts.isShorthandPropertyAssignment(prop) ||
        ts.isMethodDeclaration(prop)
      ) {
        const name = prop.name;
        if (!name) continue;
        if (ts.isIdentifier(name)) keys.add(name.text);
        else if (ts.isStringLiteral(name)) keys.add(name.text);
        else if (ts.isNumericLiteral(name)) keys.add(name.text);
        continue;
      }
    }
  };

  if (ts.isBlock(body)) {
    const visit = (node: ts.Node): void => {
      if (
        ts.isReturnStatement(node) &&
        node.expression &&
        ts.isObjectLiteralExpression(node.expression)
      ) {
        addObjectKeys(node.expression);
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(body, visit);
  } else {
    let expr: ts.Expression = body;
    while (ts.isParenthesizedExpression(expr)) expr = expr.expression;
    if (ts.isObjectLiteralExpression(expr)) addObjectKeys(expr);
  }

  const list = Array.from(keys).sort();
  return list.length > 0 ? list : undefined;
}

function getParamsFromSignature(
  sourceFile: ts.SourceFile,
  params: readonly ts.ParameterDeclaration[],
): ProcessParam[] {
  return params.map((param) => {
    const name = ts.isIdentifier(param.name)
      ? param.name.text
      : stringifyNode(sourceFile, param.name);
    return {
      name,
      hasDefault: param.initializer !== undefined,
      isRest: param.dotDotDotToken !== undefined,
    };
  });
}

export function extractProcessExportsFromSource(
  sourceText: string,
  filePath: string,
  modulePath: string,
): ProcessExport[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.JS,
  );
  const kind = determineProcessKind(modulePath);
  const results: ProcessExport[] = [];

  const addExport = (
    exportName: string,
    node: ts.Node,
    params: ProcessParam[],
    returnKeys?: string[],
  ): void => {
    const doc = getLeadingDocComment(sourceText, node);
    const entry: ProcessExport = {
      id: `${modulePath.replace(/\\/g, '/')}#${exportName}`,
      modulePath: modulePath.replace(/\\/g, '/'),
      exportName,
      kind,
      params,
      filePath,
    };
    if (doc) entry.doc = doc;
    if (returnKeys && returnKeys.length > 0) entry.returnKeys = returnKeys;
    results.push(entry);
  };

  for (const stmt of sourceFile.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      const isExported =
        stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      if (!isExported) continue;
      addExport(
        stmt.name.text,
        stmt,
        getParamsFromSignature(sourceFile, stmt.parameters),
        stmt.body ? getReturnKeysFromFunctionBody(sourceFile, stmt.body) : undefined,
      );
      continue;
    }

    if (!ts.isVariableStatement(stmt)) continue;
    const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!isExported) continue;

    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      const exportName = decl.name.text;
      const init = decl.initializer;
      if (!init) continue;

      if (ts.isArrowFunction(init)) {
        addExport(
          exportName,
          stmt,
          getParamsFromSignature(sourceFile, init.parameters),
          getReturnKeysFromFunctionBody(sourceFile, init.body),
        );
      } else if (ts.isFunctionExpression(init)) {
        addExport(
          exportName,
          stmt,
          getParamsFromSignature(sourceFile, init.parameters),
          init.body ? getReturnKeysFromFunctionBody(sourceFile, init.body) : undefined,
        );
      }
    }
  }

  return results;
}

function walkFiles(root: string, relative: string, out: string[]): void {
  const full = path.join(root, relative);
  const entries = fs.readdirSync(full, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const childRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      walkFiles(root, childRelative, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) out.push(childRelative);
  }
}

export function scanProcessCatalog(processesRootPath: string): ProcessCatalog {
  const files: string[] = [];
  walkFiles(processesRootPath, '.', files);

  const exports: ProcessExport[] = [];
  for (const relPath of files) {
    const fullPath = path.join(processesRootPath, relPath);
    const sourceText = fs.readFileSync(fullPath, 'utf8');
    const modulePath = path
      .join('.a5c', 'processes', relPath)
      .replace(/\\/g, '/')
      .replace(/\/\.\//g, '/');
    exports.push(...extractProcessExportsFromSource(sourceText, fullPath, modulePath));
  }

  exports.sort((a, b) => a.id.localeCompare(b.id));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    processesRootPath,
    exports,
  };
}
