const Module = require('module');
const path = require('path');

const originalResolve = Module._resolveFilename;
const implPath = path.resolve(__dirname, 'bun-test-impl.js');

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'bun:test') {
    return implPath;
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
