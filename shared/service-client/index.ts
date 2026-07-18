// ============================================================
// CulinaryOS — Inter-Service Client SDK
// Used by every service to call other services.
// Never call another service's HTTP API directly — use this.
// ============================================================

import type { ServiceName, ServiceRequest, ServiceResponse, ServiceHealth } from '../types/service';
import type { DomainEvent, EventType } from '../types/events';
import { v4 as uuidv4 } from 'uuid';

export interface ServiceClientConfig {
  callerService: ServiceName;
  tenantId: string;
  registry: ServiceRegistry;
  apiKey?: string;
}

export interface ServiceRegistry {
  getUrl(service: ServiceName): string;
}

export class ServiceClient {
  constructor(private config: ServiceClientConfig) {}

  // ---- HTTP calls ----

  async get<T>(service: ServiceName, path: string): Promise<ServiceResponse<T>> {
    return this.request<T>(service, 'GET', path);
  }

  async post<T>(service: ServiceName, path: string, body: unknown): Promise<ServiceResponse<T>> {
    return this.request<T>(service, 'POST', path, body);
  }

  async patch<T>(service: ServiceName, path: string, body: unknown): Promise<ServiceResponse<T>> {
    return this.request<T>(service, 'PATCH', path, body);
  }

  async del<T>(service: ServiceName, path: string): Promise<ServiceResponse<T>> {
    return this.request<T>(service, 'DELETE', path);
  }

  // ---- Health check ----

  async health(service: ServiceName): Promise<ServiceHealth> {
    const url = this.config.registry.getUrl(service);
    const res = await fetch(`${url}/health`);
    return res.json() as Promise<ServiceHealth>;
  }

  // ---- Event emission (fire-and-forget to CulinaryOS event bus) ----

  async emit<T>(eventType: EventType, payload: T): Promise<void> {
    const event: DomainEvent<T> = {
      eventId: uuidv4(),
      eventType,
      tenantId: this.config.tenantId,
      source: this.config.callerService,
      timestamp: new Date().toISOString(),
      version: 1,
      payload,
    };
    try {
      const url = this.config.registry.getUrl('culinaryos');
      await fetch(`${url}/internal/events`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(event),
      });
    } catch {
      // Event bus failure is non-fatal — log and continue
      console.error(`[ServiceClient] Failed to emit event: ${eventType}`);
    }
  }

  // ---- Private ----

  private async request<T>(
    service: ServiceName,
    method: string,
    path: string,
    body?: unknown
  ): Promise<ServiceResponse<T>> {
    const url = this.config.registry.getUrl(service);
    const requestId = uuidv4();
    const res = await fetch(`${url}${path}`, {
      method,
      headers: this.headers(requestId),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { ok: res.ok, requestId, timestamp: new Date().toISOString(), service, ...data };
  }

  private headers(requestId?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.config.tenantId,
      'X-Caller-Service': this.config.callerService,
      'X-Request-Id': requestId ?? uuidv4(),
      ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
    };
  }
}
