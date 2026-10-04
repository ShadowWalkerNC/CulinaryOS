/**
 * Connector factory: pick mock / file / api by config or environment.
 * Env: CULINARYOS_MODE=mock|file|api, CULINARYOS_DATA_DIR,
 *      CULINARYOS_API_URL, CULINARYOS_API_TOKEN
 */
import type { CulinaryOSConnector } from './contracts.ts';
import { MockConnector } from './mock.ts';
import { FileConnector } from './file.ts';
import { CulinaryOSApiConnector } from './api.ts';

export type ConnectorMode = 'mock' | 'file' | 'api';

export interface ConnectorConfig {
  mode?: ConnectorMode;
  dataDir?: string;
  baseUrl?: string;
  token?: string;
}

export function createConnector(config: ConnectorConfig = {}): CulinaryOSConnector {
  const mode: ConnectorMode =
    config.mode ??
    (process.env.CULINARYOS_MODE as ConnectorMode | undefined) ??
    'mock';

  if (mode === 'api') {
    const baseUrl = config.baseUrl ?? process.env.CULINARYOS_API_URL ?? '';
    const token = config.token ?? process.env.CULINARYOS_API_TOKEN ?? '';
    return new CulinaryOSApiConnector({ baseUrl, token });
  }
  if (mode === 'file') {
    const dir = config.dataDir ?? process.env.CULINARYOS_DATA_DIR ?? './data';
    return new FileConnector({ dir });
  }
  return new MockConnector();
}
