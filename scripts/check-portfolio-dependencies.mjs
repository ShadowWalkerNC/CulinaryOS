import { readdir, readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);

export function importsFromSource(ts, text, path) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const imports = [];
  function visit(node) {
    let value;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) value = node.moduleSpecifier;
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) value = node.moduleReference.expression;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      value = node.arguments[0];
      if (!value || !ts.isStringLiteralLike(value)) imports.push({ specifier: null, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
    }
    if (value && ts.isStringLiteralLike(value)) imports.push({ specifier: value.text, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
    ts.forEachChild(node, visit);
  }
  visit(source);
  return imports;
}

export async function checkPackageAppBoundary(root, ts) {
  const report = { scope: 'packages/*/src only: packages must not import apps', parserVersion: ts.version, files: 0, imports: 0, violations: [], unknowns: [], coverage: ['static imports/exports', 'import equals', 'literal dynamic import/require'], excluded: ['generated output', 'symlink directories', 'non-source assets', 'app-to-module and cross-domain layering'] };
  const workspaces = new Map();
  for (const group of ['apps', 'packages']) {
    const entries = await readdir(resolve(root, group), { withFileTypes: true });
    for (const entry of entries) if (entry.isDirectory()) {
      const directory = resolve(root, group, entry.name);
      try { const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')); if (manifest.name) workspaces.set(manifest.name, { directory, group }); }
      catch (error) { if (error.code !== 'ENOENT') report.unknowns.push({ path: relative(root, directory), reason: 'Unreadable workspace manifest' }); }
    }
  }
  const appRoot = resolve(root, 'apps');
  function inApps(path) { const rel = relative(appRoot, path); return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !/^[A-Za-z]:/.test(rel)); }
  async function scan(directory, options) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) { report.unknowns.push({ path: relative(root, path), reason: 'Skipped symlink' }); continue; }
      if (entry.isDirectory()) { if (!['node_modules', 'dist', 'build'].includes(entry.name)) await scan(path, options); continue; }
      if (!/\.(?:[cm]?[jt]s|[jt]sx)$/.test(entry.name)) continue;
      const imports = importsFromSource(ts, await readFile(path, 'utf8'), path);
      report.files++;
      for (const item of imports) {
        report.imports++;
        const proof = { path: relative(root, path).split(sep).join('/'), line: item.line, specifier: item.specifier };
        if (item.specifier === null) { report.unknowns.push({ ...proof, reason: 'Nonliteral module loading' }); continue; }
        const workspace = [...workspaces].find(([name]) => item.specifier === name || item.specifier.startsWith(`${name}/`))?.[1];
        const resolved = ts.resolveModuleName(item.specifier, path, options, ts.sys).resolvedModule?.resolvedFileName;
        const lexical = item.specifier.startsWith('.') ? resolve(directory, item.specifier) : null;
        if (workspace?.group === 'apps' || (resolved && inApps(resolve(resolved))) || (lexical && inApps(lexical))) report.violations.push(proof);
        else if (!resolved && (workspace || item.specifier.startsWith('.') || Object.keys(options.paths ?? {}).some(alias => item.specifier.startsWith(alias.split('*')[0])))) {
          let existingAsset = false;
          if (lexical && /\.(css|svg|png|jpg|json)$/.test(item.specifier)) {
            try { existingAsset = (await stat(lexical)).isFile(); } catch { /* Missing assets remain unknown. */ }
          }
          if (!existingAsset) report.unknowns.push({ ...proof, reason: 'Unresolved internal import' });
        }
      }
    }
  }
  for (const workspace of workspaces.values()) if (workspace.group === 'packages') {
    const configPath = resolve(workspace.directory, 'tsconfig.json');
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    let options = { moduleResolution: ts.ModuleResolutionKind.Bundler, allowJs: true };
    if (!config.error) {
      const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, workspace.directory);
      options = parsed.options;
      for (const error of parsed.errors.filter(error => error.code !== 18003)) report.unknowns.push({ path: relative(root, configPath), reason: ts.flattenDiagnosticMessageText(error.messageText, ' ') });
    } else report.unknowns.push({ path: relative(root, configPath), reason: 'No readable tsconfig; default resolution used' });
    const source = resolve(workspace.directory, 'src');
    try { if ((await stat(source)).isDirectory()) await scan(source, options); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  report.status = report.violations.length ? 'FAIL' : report.unknowns.length ? 'INCOMPLETE' : 'PASS';
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tsPath = process.argv[process.argv.indexOf('--typescript') + 1];
  if (!process.argv.includes('--typescript') || !tsPath) throw new Error('Supply --typescript <existing TypeScript module>; no installation performed.');
  const ts = require(resolve(tsPath));
  const report = await checkPackageAppBoundary(fileURLToPath(new URL('../', import.meta.url)), ts);
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'PASS') process.exitCode = 1;
}
