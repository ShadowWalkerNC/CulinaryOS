import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.turbo' || file === '.agents') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walkDir(rootDir);
const issues = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(rootDir, file);

  lines.forEach((line, idx) => {
    // Check for imports from shared (relative or non-package)
    if (/(from|import)\s+['"][^'"]*shared/i.test(line) && !line.includes('@culinaryos/shared')) {
      issues.push({ file: relPath, lineNum: idx + 1, type: 'shared-relative', line: line.trim() });
    }
    // Check for cross-package /src/ imports (e.g. @culinaryos/db/src, ../../packages/.../src, ../../apps/.../src)
    if (/(from|import)\s+['"][^'"]*\/src\//i.test(line) && (line.includes('packages/') || line.includes('apps/') || line.includes('@culinaryos/'))) {
      issues.push({ file: relPath, lineNum: idx + 1, type: 'cross-pkg-src', line: line.trim() });
    }
    // Check for unmonorepoized relative escapes to other packages or root directories
    if (/(from|import)\s+['"](\.\.\/)+kds\//i.test(line) || /(from|import)\s+['"](\.\.\/)+pos\//i.test(line) || /(from|import)\s+['"](\.\.\/)+backend\//i.test(line)) {
      issues.push({ file: relPath, lineNum: idx + 1, type: 'unmonorepo-escape', line: line.trim() });
    }
    // Check for direct package src imports e.g. '@culinaryos/db/src' or '@culinaryos/event-bus/src'
    if (/(from|import)\s+['"]@culinaryos\/[^'"]+\/src/i.test(line)) {
      issues.push({ file: relPath, lineNum: idx + 1, type: 'pkg-src-import', line: line.trim() });
    }
  });
}

console.log(JSON.stringify(issues, null, 2));
