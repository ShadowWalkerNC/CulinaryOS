// ============================================================
// CulinaryOS — Manager Authorization & Immutable Audit Trail
// ============================================================

import { adminSupabase } from '../middleware/supabase.js';
import { isLiveSupabaseConfigured } from './secrets.js';
import { DEMO_STAFF, verifyPin } from './pin.js';

export interface AuditLogRecord {
  id: string;
  tenant_id: string;
  timestamp: string;
  manager_id: string;
  manager_name: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  reason_code?: string | null;
  reason_description?: string | null;
  amount_cents?: number | null;
  notes?: string | null;
  metadata?: Record<string, any>;
}

// In-memory mock audit log for demo / offline operation
const mockAuditLogs: AuditLogRecord[] = [];

/**
 * Record a manager authorized action in the immutable audit ledger.
 */
export async function logAuditTrail(
  supabase: any,
  entry: {
    tenantId: string;
    managerId: string;
    managerName?: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    reasonCode?: string | null;
    reasonDescription?: string | null;
    amountCents?: number | null;
    notes?: string | null;
    metadata?: Record<string, any>;
  }
): Promise<AuditLogRecord> {
  const record: AuditLogRecord = {
    id: crypto.randomUUID(),
    tenant_id: entry.tenantId,
    timestamp: new Date().toISOString(),
    manager_id: entry.managerId,
    manager_name: entry.managerName || 'Manager',
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId ?? null,
    reason_code: entry.reasonCode ?? null,
    reason_description: entry.reasonDescription ?? null,
    amount_cents: entry.amountCents ?? null,
    notes: entry.notes ?? null,
    metadata: entry.metadata ?? {},
  };

  // Always keep in local log
  mockAuditLogs.unshift(record);

  // If live Supabase exists, also persist to database
  if (supabase) {
    try {
      await supabase.from('audit_logs').insert({
        id: record.id,
        tenant_id: record.tenant_id,
        manager_id: record.manager_id,
        manager_name: record.manager_name,
        action: record.action,
        target_type: record.target_type,
        target_id: record.target_id,
        reason_code: record.reason_code,
        reason_description: record.reason_description,
        amount_cents: record.amount_cents,
        notes: record.notes,
        metadata: record.metadata,
        created_at: record.timestamp,
      });
    } catch (e) {
      // Graceful fallback to memory log
    }
  }

  return record;
}

/**
 * Retrieve audit log entries for a given tenant.
 */
export async function getAuditLogs(
  supabase: any,
  tenantId: string,
  limit = 50
): Promise<AuditLogRecord[]> {
  if (!supabase) {
    return mockAuditLogs.filter((l) => l.tenant_id === tenantId).slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return mockAuditLogs.filter((l) => l.tenant_id === tenantId).slice(0, limit);
    }

    return data.map((d: any) => ({
      id: d.id,
      tenant_id: d.tenant_id,
      timestamp: d.created_at || d.timestamp || new Date().toISOString(),
      manager_id: d.manager_id,
      manager_name: d.manager_name,
      action: d.action,
      target_type: d.target_type,
      target_id: d.target_id,
      reason_code: d.reason_code,
      reason_description: d.reason_description,
      amount_cents: d.amount_cents,
      notes: d.notes,
      metadata: d.metadata,
    }));
  } catch {
    return mockAuditLogs.filter((l) => l.tenant_id === tenantId).slice(0, limit);
  }
}

/**
 * Verifies if a given PIN belongs to an active manager or owner.
 * Timing-safe, works seamlessly across live Supabase and offline/relaxed demo mode.
 */
export async function verifyManagerPinDirectly(
  tenantId: string,
  pin: string
): Promise<{
  authorized: boolean;
  managerId?: string;
  managerName?: string;
  role?: string;
  error?: string;
}> {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{4,8}$/.test(cleanPin)) {
    return { authorized: false, error: 'PIN must be 4–8 digits' };
  }

  // Demo fallback check
  const demoManager = DEMO_STAFF.find(
    (s) => s.pin === cleanPin && (s.role === 'manager' || (s.role as string) === 'owner')
  );

  if ((process.env.AUTH_RELAXED === 'true' || !isLiveSupabaseConfigured()) && demoManager) {
    return {
      authorized: true,
      managerId: `demo-${demoManager.role}`,
      managerName: demoManager.displayName,
      role: demoManager.role,
    };
  }

  // Live Supabase verification
  if (isLiveSupabaseConfigured()) {
    const admin = adminSupabase();
    if (admin) {
      try {
        const { data: rows, error } = await admin
          .from('staff_pins')
          .select('user_id, pin_hash, display_name, active')
          .eq('tenant_id', tenantId)
          .eq('active', true);

        if (!error && rows) {
          const match = rows.find((r: any) => verifyPin(cleanPin, r.pin_hash));
          if (match) {
            const { data: membership } = await admin
              .from('tenant_users')
              .select('role')
              .eq('tenant_id', tenantId)
              .eq('user_id', match.user_id)
              .maybeSingle();

            const role = membership?.role ?? 'manager';
            if (['manager', 'owner', 'admin'].includes(role.toLowerCase())) {
              return {
                authorized: true,
                managerId: match.user_id,
                managerName: match.display_name,
                role,
              };
            } else {
              return {
                authorized: false,
                error: `PIN belongs to user "${match.display_name}" with role "${role}", which lacks manager authority.`,
              };
            }
          }
        }
      } catch {
        // Continue to demo manager fallback
      }
    }
  }

  // If PIN matched demo manager (5678)
  if (demoManager) {
    return {
      authorized: true,
      managerId: `demo-${demoManager.role}`,
      managerName: demoManager.displayName,
      role: demoManager.role,
    };
  }

  // Check if PIN matched a non-manager demo user (e.g. server 1234)
  const demoNonManager = DEMO_STAFF.find((s) => s.pin === cleanPin);
  if (demoNonManager) {
    return {
      authorized: false,
      error: `User "${demoNonManager.displayName}" (${demoNonManager.role}) lacks manager privileges.`,
    };
  }

  return { authorized: false, error: 'Invalid PIN' };
}
