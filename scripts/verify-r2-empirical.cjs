const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function getSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.git', 'dist', 'build', '.turbo', '.agents', '.next'].includes(file)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getSourceFiles(filePath, fileList);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function getPackageRoot(filePath) {
  let currentDir = path.dirname(filePath);
  while (currentDir.length >= rootDir.length) {
    const pkgJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(pkgJsonPath) && currentDir !== rootDir) {
      return currentDir;
    }
    if (currentDir === rootDir) break;
    currentDir = path.dirname(currentDir);
  }
  return rootDir;
}

const IMPORT_EXPORT_REGEX = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const REQUIRE_REGEX = /require\(['"]([^'"]+)['"]\)/g;
const DYNAMIC_IMPORT_REGEX = /import\(['"]([^'"]+)['"]\)/g;

function extractImports(content) {
  const specifiers = [];
  let match;

  IMPORT_EXPORT_REGEX.lastIndex = 0;
  REQUIRE_REGEX.lastIndex = 0;
  DYNAMIC_IMPORT_REGEX.lastIndex = 0;

  while ((match = IMPORT_EXPORT_REGEX.exec(content)) !== null) {
    specifiers.push({ specifier: match[1], index: match.index });
  }
  while ((match = REQUIRE_REGEX.exec(content)) !== null) {
    specifiers.push({ specifier: match[1], index: match.index });
  }
  while ((match = DYNAMIC_IMPORT_REGEX.exec(content)) !== null) {
    specifiers.push({ specifier: match[1], index: match.index });
  }
  return specifiers;
}

const allSourceFiles = getSourceFiles(rootDir);
console.log(`Analyzing ${allSourceFiles.length} source files across repository...\n`);

const relativeEscapes = [];
const directSrcImports = [];
const rootSharedImports = [];
const sharedImports = [];

for (const filePath of allSourceFiles) {
  const relativeFilePath = path.relative(rootDir, filePath);
  const pkgRoot = getPackageRoot(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const specifiers = extractImports(content);

  for (const { specifier } of specifiers) {
    // Check 1: Relative Path Escapes
    if (specifier.startsWith('.')) {
      const resolvedPath = path.resolve(path.dirname(filePath), specifier);
      
      // Check if importing root 'shared' dir directly via relative path
      if (resolvedPath.startsWith(path.join(rootDir, 'shared') + path.sep) || resolvedPath === path.join(rootDir, 'shared')) {
        rootSharedImports.push({
          file: relativeFilePath,
          specifier,
          resolved: path.relative(rootDir, resolvedPath)
        });
      }

      // Check if resolved path escapes package root
      if (pkgRoot !== rootDir && !resolvedPath.startsWith(pkgRoot + path.sep) && resolvedPath !== pkgRoot) {
        // Ignore edge functions inside supabase directory
        if (!relativeFilePath.startsWith(`supabase${path.sep}`)) {
          relativeEscapes.push({
            file: relativeFilePath,
            pkgRoot: path.relative(rootDir, pkgRoot),
            specifier,
            resolved: path.relative(rootDir, resolvedPath)
          });
        }
      }
    }

    // Check 2: Direct /src/ cross-package imports
    if (specifier.includes('/src/') || specifier.endsWith('/src')) {
      if (specifier.startsWith('@culinaryos/') || specifier.includes('packages/') || specifier.includes('apps/')) {
        directSrcImports.push({
          file: relativeFilePath,
          specifier
        });
      }
    }

    // Track all @culinaryos/shared imports
    if (specifier.startsWith('@culinaryos/shared')) {
      sharedImports.push({
        file: relativeFilePath,
        specifier
      });
    }
  }
}

console.log('=== CHECK 1: RELATIVE PATH ESCAPES ACROSS PACKAGES ===');
if (relativeEscapes.length === 0) {
  console.log('PASS: Zero relative path escapes detected across package boundaries.');
} else {
  console.log(`FAIL: Found ${relativeEscapes.length} relative path escapes:`);
  console.log(JSON.stringify(relativeEscapes, null, 2));
}

console.log('\n=== CHECK 2: DIRECT /src/ CROSS-PACKAGE IMPORTS ===');
if (directSrcImports.length === 0) {
  console.log('PASS: Zero direct /src/ cross-package imports detected.');
} else {
  console.log(`FAIL: Found ${directSrcImports.length} direct /src/ cross-package imports:`);
  console.log(JSON.stringify(directSrcImports, null, 2));
}

console.log('\n=== CHECK 3: IMPORTS OF ROOT shared/ DIRECTORY ===');
if (rootSharedImports.length === 0) {
  console.log('PASS: Zero imports targeting root shared/ directory detected.');
} else {
  console.log(`FAIL: Found ${rootSharedImports.length} imports targeting root shared/ directory:`);
  console.log(JSON.stringify(rootSharedImports, null, 2));
}

console.log('\n=== CHECK 4: RESOLUTION OF @culinaryos/shared IMPORTS ===');
console.log(`Found ${sharedImports.length} imports referencing @culinaryos/shared.`);

const sharedPkgPath = path.join(rootDir, 'packages', 'shared', 'package.json');
const sharedPkg = JSON.parse(fs.readFileSync(sharedPkgPath, 'utf8'));

console.log('Validating @culinaryos/shared package.json configuration...');
console.log('Package name:', sharedPkg.name);
console.log('Exports config:', JSON.stringify(sharedPkg.exports, null, 2));

let unresolvableSharedSpecifiers = 0;
const checkedSpecifiers = new Set(sharedImports.map(i => i.specifier));

for (const spec of checkedSpecifiers) {
  let subpath = spec.replace('@culinaryos/shared', '.');
  if (subpath === '') subpath = '.';
  
  const mapped = sharedPkg.exports[subpath];
  if (!mapped) {
    console.log(`FAIL: Specifier '${spec}' (subpath '${subpath}') is NOT declared in packages/shared/package.json exports!`);
    unresolvableSharedSpecifiers++;
  } else {
    const targetFile = path.resolve(rootDir, 'packages', 'shared', mapped);
    if (!fs.existsSync(targetFile)) {
      console.log(`FAIL: Specifier '${spec}' maps to '${mapped}' but file does NOT exist at ${targetFile}`);
      unresolvableSharedSpecifiers++;
    } else {
      console.log(`OK: '${spec}' -> '${mapped}' (${targetFile}) [EXISTS]`);
    }
  }
}

if (unresolvableSharedSpecifiers === 0) {
  console.log('PASS: All @culinaryos/shared imports resolve cleanly to existing files in packages/shared.');
} else {
  console.log(`FAIL: ${unresolvableSharedSpecifiers} @culinaryos/shared subpath imports failed resolution!`);
}

const overallPass = relativeEscapes.length === 0 && directSrcImports.length === 0 && rootSharedImports.length === 0 && unresolvableSharedSpecifiers === 0;

console.log('\n==================================================');
console.log(`FINAL EMPIRICAL VERDICT: ${overallPass ? 'PASS' : 'FAIL'}`);
console.log('==================================================');

process.exit(overallPass ? 0 : 1);
