const Module = require('module');
const path = require('path');

const originalResolve = Module._resolveFilename;
const implPath = path.resolve(__dirname, 'bun-test-impl.js');

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'bun:test') {
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

