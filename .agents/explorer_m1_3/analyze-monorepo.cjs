const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../');

function getFiles(dir, matchExt, ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.agents']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.includes(entry.name)) {
        results = results.concat(getFiles(fullPath, matchExt, ignoreDirs));
      }
    } else {
      if (matchExt.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// 1. Load all package.json files
const pkgJsonFiles = getFiles(ROOT_DIR, ['package.json']);
const packagesMap = new Map();
const knownWorkspacePkgNames = new Set();

for (const file of pkgJsonFiles) {
  const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
  try {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    const pkgName = content.name || relPath;
    const deps = content.dependencies || {};
    const devDeps = content.devDependencies || {};
    const peerDeps = content.peerDependencies || {};
    const allDeps = { ...deps, ...devDeps, ...peerDeps };
    
    packagesMap.set(pkgName, {
      name: pkgName,
      file,
      relPath,
      dir: path.dirname(file),
      relDir: path.relative(ROOT_DIR, path.dirname(file)).replace(/\\/g, '/'),
      content,
      deps,
      devDeps,
      peerDeps,
      allDeps
    });
    knownWorkspacePkgNames.add(pkgName);
  } catch (e) {
    console.error(`Error parsing ${relPath}:`, e.message);
  }
}

// 2. Load all tsconfig files
const tsconfigFiles = getFiles(ROOT_DIR, ['tsconfig.json', 'tsconfig.base.json']);
const tsconfigsMap = new Map();

for (const file of tsconfigFiles) {
  const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const cleaned = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    const content = JSON.parse(cleaned);
    tsconfigsMap.set(relPath, { file, relPath, content });
  } catch (e) {
    console.error(`Error parsing tsconfig ${relPath}:`, e.message);
  }
}

// 3. Scan all source code files (.ts, .tsx, .js, .jsx)
const srcFiles = getFiles(ROOT_DIR, ['.ts', '.tsx', '.js', '.jsx'], ['node_modules', '.git', 'dist', 'build', '.agents']);

const importRegex = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;

const packageImports = new Map();
const unlinkedRootImports = []; // imports targeting root/shared, root/kds, etc.

for (const file of srcFiles) {
  const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
  
  let ownerPkg = null;
  let longestPrefix = -1;
  for (const [pkgName, pkg] of packagesMap.entries()) {
    if (pkg.relDir === '') continue;
    if (relPath.startsWith(pkg.relDir + '/')) {
      if (pkg.relDir.length > longestPrefix) {
        longestPrefix = pkg.relDir.length;
        ownerPkg = pkgName;
      }
    }
  }
  if (!ownerPkg) ownerPkg = 'culinaryos';

  if (!packageImports.has(ownerPkg)) {
    packageImports.set(ownerPkg, new Map());
  }
  const ownerMap = packageImports.get(ownerPkg);

  const code = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const specifier = match[1] || match[2];
    if (specifier) {
      if (!ownerMap.has(specifier)) ownerMap.set(specifier, []);
      ownerMap.get(specifier).push(relPath);

      if (specifier.includes('shared/types') || specifier.includes('shared/realtime') || specifier.includes('shared/service-client') || specifier.includes('kds/server')) {
        unlinkedRootImports.push({ file: relPath, specifier });
      }
    }
  }
}

const auditReport = {
  discoveredPackages: Array.from(packagesMap.values()).map(p => ({ name: p.name, path: p.relPath })),
  workspaceSpecifiers: [],
  missingDependencies: [],
  unusedWorkspaceDependencies: [],
  unlinkedRootImports,
  circularDependencies: [],
  tsconfigIssues: []
};

// Audit 1: Workspace Specifiers
for (const [pkgName, pkg] of packagesMap.entries()) {
  if (pkg.relDir === '') continue;
  for (const [depName, versionSpec] of Object.entries(pkg.allDeps)) {
    if (knownWorkspacePkgNames.has(depName)) {
      if (versionSpec !== 'workspace:*') {
        auditReport.workspaceSpecifiers.push({
          pkg: pkgName,
          file: pkg.relPath,
          dependency: depName,
          currentSpecifier: versionSpec,
          expectedSpecifier: 'workspace:*'
        });
      }
    }
  }
}

// Audit 2: Missing Dependencies (Imports vs Package.json)
for (const [pkgName, pkg] of packagesMap.entries()) {
  if (pkg.relDir === '') continue;
  const ownerMap = packageImports.get(pkgName);
  if (!ownerMap) continue;

  for (const [specifier, files] of ownerMap.entries()) {
    if (knownWorkspacePkgNames.has(specifier)) {
      if (!pkg.allDeps[specifier]) {
        auditReport.missingDependencies.push({
          pkg: pkgName,
          file: pkg.relPath,
          missingDependency: specifier,
          importedInFiles: files
        });
      }
    }
  }
}

// Audit 3: Circular Dependencies (DFS)
const graph = new Map();
for (const [pkgName, pkg] of packagesMap.entries()) {
  const depsSet = new Set();
  for (const depName of Object.keys(pkg.allDeps)) {
    if (knownWorkspacePkgNames.has(depName) && depName !== pkgName) {
      depsSet.add(depName);
    }
  }
  const ownerMap = packageImports.get(pkgName);
  if (ownerMap) {
    for (const specifier of ownerMap.keys()) {
      if (knownWorkspacePkgNames.has(specifier) && specifier !== pkgName) {
        depsSet.add(specifier);
      }
    }
  }
  graph.set(pkgName, depsSet);
}

const cycles = [];
function findCycles(node, visited, pathStack) {
  visited.add(node);
  pathStack.push(node);

  const neighbors = graph.get(node) || new Set();
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      findCycles(neighbor, visited, pathStack);
    } else {
      const cycleStart = pathStack.indexOf(neighbor);
      if (cycleStart !== -1) {
        const cycle = pathStack.slice(cycleStart).concat(neighbor);
        cycles.push(cycle);
      }
    }
  }

  pathStack.pop();
  visited.delete(node);
}

for (const node of graph.keys()) {
  findCycles(node, new Set(), []);
}
auditReport.circularDependencies = cycles;

// Audit 4: TSConfig Audit
for (const [relPath, tsconfig] of tsconfigsMap.entries()) {
  const content = tsconfig.content;
  const compilerOptions = content.compilerOptions || {};
  const issues = [];

  if (relPath !== 'tsconfig.base.json') {
    if (!content.extends) {
      issues.push('Missing extends: does not extend tsconfig.base.json');
    }
  }

  if (relPath === 'apps/server/tsconfig.json') {
    if (compilerOptions.rootDir && compilerOptions.rootDir !== './src' && compilerOptions.rootDir !== 'src') {
      issues.push(`rootDir set to "${compilerOptions.rootDir}" instead of "./src"`);
    }
    if (compilerOptions.paths) {
      for (const [alias, targets] of Object.entries(compilerOptions.paths)) {
        if (targets.some(t => t.includes('../../packages/'))) {
          issues.push(`Path mapping "${alias}" -> ${JSON.stringify(targets)} points directly to package source files`);
        }
      }
    }
  }

  if (relPath === 'mcp/tsconfig.json') {
    if (compilerOptions.paths && compilerOptions.paths['@culinaryos/ratio-engine']) {
      issues.push(`Path mapping "@culinaryos/ratio-engine" -> ${JSON.stringify(compilerOptions.paths['@culinaryos/ratio-engine'])} points directly to package dist file`);
    }
  }

  if (issues.length > 0) {
    auditReport.tsconfigIssues.push({
      file: relPath,
      issues
    });
  }
}

// Check for missing tsconfig files in packages/apps
const expectedTsconfigDirs = ['apps/admin', 'apps/kds', 'apps/pos', 'apps/server', 'apps/web', 'cli', 'mcp', 'mobile', 'packages/auth', 'packages/config', 'packages/db', 'packages/event-bus', 'packages/ratio-engine', 'packages/shared', 'packages/ui'];

for (const dir of expectedTsconfigDirs) {
  const tsconfigPath = `${dir}/tsconfig.json`;
  if (!tsconfigsMap.has(tsconfigPath)) {
    auditReport.tsconfigIssues.push({
      file: tsconfigPath,
      issues: ['File does not exist (missing tsconfig.json)']
    });
  }
}

console.log(JSON.stringify(auditReport, null, 2));
