const fs = require('fs');
const path = require('path');

const rootDir = 'c:/Users/User/Documents/CulinaryOS';

function logSection(title) {
  console.log(`\n========================================\n${title}\n========================================`);
}

const results = {
  dockerCompose: { pass: true, issues: [] },
  dockerfiles: { pass: true, issues: [] },
  envVars: { pass: true, issues: [] }
};

// 1. Analyze docker-compose.yml
logSection('1. Analyzing docker-compose.yml');

const dockerComposePath = path.join(rootDir, 'docker-compose.yml');
if (!fs.existsSync(dockerComposePath)) {
  results.dockerCompose.pass = false;
  results.dockerCompose.issues.push('docker-compose.yml file not found!');
} else {
  const content = fs.readFileSync(dockerComposePath, 'utf8');

  // Check version
  if (content.includes("version: '3.9'") || content.includes('version: "3.9"')) {
    console.log('[INFO] docker-compose uses version 3.9');
  }

  // Parse services manually or via regex/basic YAML logic
  const serviceRegex = /^\s{2}([a-zA-Z0-9_-]+):\s*$/gm;
  const services = [];
  let match;
  while ((match = serviceRegex.exec(content)) !== null) {
    if (!['build', 'ports', 'environment', 'depends_on', 'healthcheck', 'restart', 'env_file'].includes(match[1])) {
      services.push(match[1]);
    }
  }

  console.log('Detected services in docker-compose.yml:', services);

  // Check context paths and dockerfile paths
  const contextDockerfiles = [
    { service: 'backend', context: '.', dockerfile: 'apps/server/Dockerfile' },
    { service: 'pos-client', context: '.', dockerfile: 'apps/pos/Dockerfile' },
    { service: 'kds-client', context: '.', dockerfile: 'apps/kds/Dockerfile' },
    { service: 'admin-client', context: '.', dockerfile: 'apps/admin/Dockerfile' },
    { service: 'web-client', context: '.', dockerfile: 'apps/web/Dockerfile' }
  ];

  for (const item of contextDockerfiles) {
    const fullContext = path.join(rootDir, item.context);
    const fullDockerfile = path.join(rootDir, item.dockerfile);
    if (!fs.existsSync(fullContext)) {
      results.dockerCompose.pass = false;
      results.dockerCompose.issues.push(`Service '${item.service}': Context path '${item.context}' does not exist.`);
    }
    if (!fs.existsSync(fullDockerfile)) {
      results.dockerCompose.pass = false;
      results.dockerCompose.issues.push(`Service '${item.service}': Dockerfile '${item.dockerfile}' does not exist.`);
    } else {
      console.log(`[PASS] Service '${item.service}': Dockerfile '${item.dockerfile}' exists.`);
    }
  }

  // Check port collisions
  const portRegex = /-\s*"(\d+):(\d+)"/g;
  const hostPorts = new Map();
  while ((match = portRegex.exec(content)) !== null) {
    const hostPort = match[1];
    const containerPort = match[2];
    if (hostPorts.has(hostPort)) {
      results.dockerCompose.pass = false;
      results.dockerCompose.issues.push(`Port Overlap Error: Host port ${hostPort} is mapped multiple times (by ${hostPorts.get(hostPort)} and container port ${containerPort})!`);
    } else {
      hostPorts.set(hostPort, containerPort);
    }
  }
  console.log('Host Port Mappings:', Array.from(hostPorts.entries()).map(([h, c]) => `${h}:${c}`).join(', '));

  // Check backend healthcheck vs Dockerfile
  const backendDockerfile = fs.readFileSync(path.join(rootDir, 'apps/server/Dockerfile'), 'utf8');
  if (content.includes('wget') && backendDockerfile.includes('node:20-slim') && !backendDockerfile.includes('wget')) {
    results.dockerCompose.pass = false;
    results.dockerCompose.issues.push(
      "CRITICAL HEALTHCHECK FAILURE: docker-compose.yml backend healthcheck uses 'wget', but apps/server/Dockerfile uses 'node:20-slim' base image without installing 'wget'. The healthcheck will fail with command not found (exit code 127), marking backend unhealthy and blocking dependent services (pos-client, kds-client, admin-client, web-client)."
    );
  }
}

// 2. Analyze Dockerfiles and Workspace build setup
logSection('2. Analyzing Dockerfiles and Workspace Setup');

const apps = ['admin', 'kds', 'pos', 'server', 'web'];
for (const app of apps) {
  const dfPath = path.join(rootDir, `apps/${app}/Dockerfile`);
  if (fs.existsSync(dfPath)) {
    const dfContent = fs.readFileSync(dfPath, 'utf8');
    
    // Check nginx.conf reference if nginx image used
    if (dfContent.includes('nginx.conf')) {
      const nginxPath = path.join(rootDir, `apps/${app}/nginx.conf`);
      if (!fs.existsSync(nginxPath)) {
        results.dockerfiles.pass = false;
        results.dockerfiles.issues.push(`apps/${app}/Dockerfile references nginx.conf, but apps/${app}/nginx.conf does not exist!`);
      } else {
        console.log(`[PASS] apps/${app}/nginx.conf exists.`);
      }
    }

    // Check pnpm package filter name vs package.json name
    const pkgJsonPath = path.join(rootDir, `apps/${app}/package.json`);
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const filterMatches = dfContent.match(/--filter\s+([@a-zA-Z0-9_/-]+)/g);
      if (filterMatches) {
        for (const fm of filterMatches) {
          const filterName = fm.replace(/--filter\s+/, '').trim();
          if (filterName !== pkg.name) {
            results.dockerfiles.pass = false;
            results.dockerfiles.issues.push(`apps/${app}/Dockerfile filter mismatch: specifies '${filterName}', but package.json name is '${pkg.name}'.`);
          }
        }
      }
    }
  }
}

// 3. Analyze Environment Variables (.env.example vs .env vs codebase)
logSection('3. Analyzing Environment Variables (.env.example vs .env vs codebase)');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  }
  return env;
}

const envExample = parseEnvFile(path.join(rootDir, '.env.example'));
const envFile = parseEnvFile(path.join(rootDir, '.env'));

console.log('.env.example keys count:', Object.keys(envExample).length);
console.log('.env keys count:', Object.keys(envFile).length);

// Check keys in .env.example missing in .env
const missingInEnv = Object.keys(envExample).filter(k => !(k in envFile));
if (missingInEnv.length > 0) {
  results.envVars.pass = false;
  results.envVars.issues.push(`.env is missing keys present in .env.example: ${missingInEnv.join(', ')}`);
}

// Scan codebase for all process.env and import.meta.env
function scanDirForEnvVars(dir, envVarsFound = new Map()) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', 'dist', '.agents', '.gemini', 'build'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirForEnvVars(fullPath, envVarsFound);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)/g;
      let m;
      while ((m = regex.exec(content)) !== null) {
        const varName = m[1];
        if (!envVarsFound.has(varName)) {
          envVarsFound.set(varName, []);
        }
        const relPath = path.relative(rootDir, fullPath);
        if (!envVarsFound.get(varName).includes(relPath)) {
          envVarsFound.get(varName).push(relPath);
        }
      }
    }
  }
  return envVarsFound;
}

const codebaseEnvVars = scanDirForEnvVars(rootDir);
console.log('\nEnvironment variables detected in codebase:');
for (const [varName, files] of codebaseEnvVars.entries()) {
  console.log(` - ${varName} (used in ${files.length} files: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''})`);
}

// Check which codebase env vars are missing from .env.example
const missingFromEnvExample = [];
for (const varName of codebaseEnvVars.keys()) {
  if (!(varName in envExample)) {
    missingFromEnvExample.push(varName);
  }
}

if (missingFromEnvExample.length > 0) {
  results.envVars.pass = false;
  results.envVars.issues.push(
    `Codebase references environment variables that are NOT documented in .env.example: ${missingFromEnvExample.join(', ')}`
  );
}

// Check build args in docker-compose.yml vs .env.example
const composeContent = fs.readFileSync(dockerComposePath, 'utf8');
const composeArgRegex = /VITE_[A-Z0-9_]+/g;
let argMatch;
const composeArgs = new Set();
while ((argMatch = composeArgRegex.exec(composeContent)) !== null) {
  composeArgs.add(argMatch[0]);
}

const missingArgsInEnvExample = Array.from(composeArgs).filter(arg => !(arg in envExample));
if (missingArgsInEnvExample.length > 0) {
  results.envVars.pass = false;
  results.envVars.issues.push(
    `docker-compose.yml uses build args/env vars missing from .env.example: ${missingArgsInEnvExample.join(', ')}`
  );
}

logSection('4. Summary & Pass/Fail Verdict');
console.log(JSON.stringify(results, null, 2));

fs.writeFileSync(
  path.join('c:/Users/User/Documents/CulinaryOS/.agents/teamwork_preview_challenger_m1_2', 'validation_results.json'),
  JSON.stringify(results, null, 2)
);
