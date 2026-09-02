const fs = require('fs');
const Module = require('module');
const path = require('path');

if (!process.env.ESBUILD_BINARY_PATH) {
  const pnpmDir = path.resolve(__dirname, '..', 'node_modules', '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const entries = fs.readdirSync(pnpmDir);
    const platformEntries = entries.filter(e => e.startsWith('@esbuild+win32-x64@') || e.startsWith('@esbuild+'));
    platformEntries.sort().reverse();
    for (const entry of platformEntries) {
      const parts = entry.split('@');
      const pkgName = parts[1]?.split('+')[0] || (process.platform === 'win32' ? 'win32-x64' : process.platform + '-' + process.arch);
      const ext = process.platform === 'win32' ? 'esbuild.exe' : 'esbuild';
      const candidate = path.join(pnpmDir, entry, 'node_modules', '@esbuild', pkgName, ext);
      if (fs.existsSync(candidate)) {
        process.env.ESBUILD_BINARY_PATH = candidate;
        break;
      }
    }
  }
}

const originalResolve = Module._resolveFilename;
const implPath = path.resolve(__dirname, 'bun-test-impl.js');

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'bun:test' || request === 'vitest' || request === '@jest/globals') {
    return implPath;
  }
  if (request.startsWith('@culinaryos/server/')) {
    const subpath = request.replace('@culinaryos/server/', '');
    const serverSrcPath = path.resolve(__dirname, '..', 'apps', 'server', 'src', subpath);
    try {
      return originalResolve.call(this, serverSrcPath, parent, isMain, options);
    } catch {
      return originalResolve.call(this, serverSrcPath + '.ts', parent, isMain, options);
    }
  }
  const pkgPrefixes = ['@culinaryos/', '@culinaryops/', '@plated/'];
  for (const prefix of pkgPrefixes) {
    if (request.startsWith(prefix)) {
      const rest = request.slice(prefix.length);
      const parts = rest.split('/');
      const pkgName = parts[0];
      const subpath = parts.slice(1).join('/');
      const basePkgDir = path.resolve(__dirname, '..', 'packages', pkgName, 'src');
      if (!subpath) {
        const indexFile = path.join(basePkgDir, 'index.ts');
        try {
          return originalResolve.call(this, indexFile, parent, isMain, options);
        } catch {
          // fall through
        }
      } else {
        const subFile = path.join(basePkgDir, subpath);
        try {
          return originalResolve.call(this, subFile, parent, isMain, options);
        } catch {
          try {
            return originalResolve.call(this, subFile + '.ts', parent, isMain, options);
          } catch {
            // fall through
          }
        }
      }
    }
  }
  if (request.endsWith('.js') && (request.startsWith('.') || request.startsWith('/'))) {
    try {
      return originalResolve.call(this, request, parent, isMain, options);
    } catch (e) {
      const tsRequest = request.slice(0, -3) + '.ts';
      try {
        return originalResolve.call(this, tsRequest, parent, isMain, options);
      } catch {
        const indexTsRequest = request.slice(0, -3) + '/index.ts';
        try {
          return originalResolve.call(this, indexTsRequest, parent, isMain, options);
        } catch {
          throw e;
        }
      }
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

