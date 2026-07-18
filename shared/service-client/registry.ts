// ============================================================
// CulinaryOS — Service Registry
// Resolves service names to base URLs from environment.
// ============================================================

import type { ServiceName, ServiceRegistration } from '../types/service';
import type { ServiceRegistry } from './index';

const SERVICE_URL_MAP: Record<ServiceName, string> = {
  culinaryos: process.env.CULINARYOS_URL    ?? 'http://localhost:3000',
  recipeos:   process.env.RECIPEOS_URL      ?? 'http://localhost:3001',
  kds:        process.env.KDS_URL           ?? 'http://localhost:3002',
  pos:        process.env.POS_URL           ?? 'http://localhost:3003',
};

export class EnvServiceRegistry implements ServiceRegistry {
  getUrl(service: ServiceName): string {
    const url = SERVICE_URL_MAP[service];
    if (!url) throw new Error(`[ServiceRegistry] Unknown service: ${service}`);
    return url;
  }
}

export const defaultRegistry = new EnvServiceRegistry();
