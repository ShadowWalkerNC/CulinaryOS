import { pathToFileURL } from 'node:url';
import path from 'node:path';

const implUrl = pathToFileURL(path.resolve('./scripts/bun-test-impl.js')).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'bun:test') {
    return {
      shortCircuit: true,
      url: implUrl,
    };
  }
  return nextResolve(specifier, context);
}
