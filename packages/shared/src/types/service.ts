// ============================================================
// CulinaryOS — Inter-Service Shared Types
// Every service imports from here. Never duplicate these.
// ============================================================

// ---- IDENTITY ----

export type ServiceName = 'recipeos' | 'kds' | 'pos' | 'culinaryos' | 'culinaryops';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;        // e.g. 'the-golden-fork'
  userId?: string;           // authenticated user within the tenant
  role?: TenantRole;
}

export type TenantRole = 'owner' | 'manager' | 'chef' | 'server' | 'viewer';

// ---- STANDARD REQUEST / RESPONSE ENVELOPE ----

export interface ServiceRequest<T = unknown> {
  tenantId: string;
  requestId: string;         // UUID for tracing
  timestamp: string;         // ISO 8601
  service: ServiceName;      // caller
  payload: T;
}

export interface ServiceResponse<T = unknown> {
  ok: boolean;
  requestId: string;         // echoed from request
  timestamp: string;
  service: ServiceName;      // responder
  data?: T;
  error?: ServiceError;
}

export interface ServiceError {
  code: string;              // e.g. 'NOT_FOUND', 'VALIDATION_ERROR', 'UNAUTHORIZED'
  message: string;
  details?: Record<string, unknown>;
}

// ---- SERVICE HEALTH ----

export interface ServiceHealth {
  service: ServiceName;
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  uptime: number;            // seconds
  checkedAt: string;         // ISO 8601
}

// ---- SERVICE REGISTRY ENTRY ----

export interface ServiceRegistration {
  name: ServiceName;
  baseUrl: string;           // e.g. 'http://localhost:3001'
  version: string;
  healthPath: string;        // e.g. '/health'
  capabilities: ServiceCapability[];
}

export type ServiceCapability =
  | 'recipes'
  | 'scaling'
  | 'pantry'
  | 'orders'
  | 'kitchen-display'
  | 'payments'
  | 'tickets'
  | 'reporting'
  | 'inventory'
  | 'menu-management';
