const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', '.turbo', 'dist', 'build'].includes(entry.name)) {
        searchDir(fullPath);
      }
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('CulinaryHeader') || content.includes('activeModule')) {
        console.log(`=== File: ${fullPath} ===`);
        content.split('\n').forEach((line, idx) => {
          if (line.includes('CulinaryHeader') || line.includes('activeModule')) {
            console.log(`  L${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir('c:\\Users\\white\\OneDrive\\Documents\\GitHub\\CulinaryOS');
