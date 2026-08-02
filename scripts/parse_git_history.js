const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function readObject(gitDir, hash) {
  const dir = hash.substring(0, 2);
  const file = hash.substring(2);
  const objPath = path.join(gitDir, 'objects', dir, file);
  if (fs.existsSync(objPath)) {
    const compressed = fs.readFileSync(objPath);
    const decompressed = zlib.inflateSync(compressed);
    const nullIdx = decompressed.indexOf(0);
    const header = decompressed.slice(0, nullIdx).toString('utf8');
    const content = decompressed.slice(nullIdx + 1);
    return { header, content };
  }
  return null;
}

// Check pack files if object is loose
function getCommit(gitDir, hash) {
  const loose = readObject(gitDir, hash);
  if (loose) {
    return loose.content.toString('utf8');
  }
  return null;
}

const gitDir = path.join(__dirname, '..', '.git');
const headRef = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
let currentHash = '';
if (headRef.startsWith('ref:')) {
  const refPath = headRef.split(' ')[1].trim();
  currentHash = fs.readFileSync(path.join(gitDir, refPath), 'utf8').trim();
} else {
  currentHash = headRef;
}

console.log('HEAD commit hash:', currentHash);

let curr = currentHash;
const visited = new Set();
const commits = [];

while (curr && !visited.has(curr)) {
  visited.add(curr);
  const content = getCommit(gitDir, curr);
  if (!content) {
    console.log(`Commit ${curr} is packed or not found as loose object.`);
    break;
  }
  commits.push({ hash: curr, content });
  const parentMatch = content.match(/^parent ([0-9a-f]{40})/m);
  if (parentMatch) {
    curr = parentMatch[1];
  } else {
    break;
  }
}

console.log(`Parsed ${commits.length} loose commits.`);
commits.forEach((c, idx) => {
  console.log(`\n--- Commit #${idx + 1}: ${c.hash} ---`);
  console.log(c.content);
});
