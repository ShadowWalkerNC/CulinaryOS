import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const implUrl = pathToFileURL(path.resolve('./scripts/bun-test-impl.js')).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'bun:test') {
    return {
      shortCircuit: true,
      url: implUrl,
      format: 'module',
    };
  }

  if (specifier.endsWith('.js') && (specifier.startsWith('.') || specifier.startsWith('/'))) {
    try {
      if (context.parentURL) {
        const parentPath = fileURLToPath(context.parentURL);
        const parentDir = path.dirname(parentPath);
        const candidateTs = path.resolve(parentDir, specifier.slice(0, -3) + '.ts');
        if (fs.existsSync(candidateTs)) {
          return {
            shortCircuit: true,
            url: pathToFileURL(candidateTs).href,
            format: 'module',
          };
        }
      }
    } catch (e) {
      // ignore error, delegate to default resolver
    }
  }

  return nextResolve(specifier, context);
}
