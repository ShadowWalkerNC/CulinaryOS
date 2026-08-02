const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.turbo' && entry.name !== 'dist' && entry.name !== 'build') {
        searchDir(fullPath, pattern, results);
      }
    } else if (entry.isFile()) {
      if (/\.(tsx?|jsx?|json|md|html)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes(pattern)) {
              results.push({ file: fullPath, line: idx + 1, text: line.trim() });
            }
          });
        } catch (e) {}
      }
    }
  }
  return results;
}

const targetDir = 'c:\\Users\\white\\OneDrive\\Documents\\GitHub\\CulinaryOS';
const pattern = process.argv[2] || 'CulinaryHeader';
console.log(`Searching for pattern: "${pattern}" in ${targetDir}`);
const matches = searchDir(targetDir, pattern);
console.log(`Found ${matches.length} matches:`);
matches.forEach(m => {
  console.log(`${m.file}:${m.line}: ${m.text}`);
});
