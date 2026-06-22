// ============================================================
// CulinaryOS Event Broker
//
// This is the single POST /internal/events endpoint handler.
// Services call this to emit events; the broker fans out to
// all registered handlers synchronously (in-process for dev).
//
// For production: swap dispatchToHandlers() for a queue
// (Supabase pg_cron, BullMQ, etc.) — the handler interface
// stays identical.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { DomainEvent, EventType } from './types';
import { handlers } from './handlers/index';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // broker needs service role to bypass RLS
);

export type EventHandler<T = unknown> = (
  event: DomainEvent<T>,
  supabase: ReturnType<typeof createClient>
) => Promise<void>;

// ---- Main entry point ----

export async function handleIncomingEvent(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  // 1. Validate envelope shape
  if (!isValidEvent(raw)) {
    return { ok: false, error: 'Invalid event envelope' };
  }
  const event = raw as DomainEvent;

  // 2. Persist to audit log (service-role bypasses RLS)
  const { error: insertError } = await supabase.from('domain_events').insert({
    event_id:   event.eventId,
    event_type: event.eventType,
    tenant_id:  event.tenantId,
    source:     event.source,
    version:    event.version,
    payload:    event.payload,
  });

  if (insertError) {
    // Duplicate event_id = already processed, skip silently
    if (insertError.code === '23505') return { ok: true };
    console.error('[EventBus] Failed to persist event:', insertError.message);
    return { ok: false, error: insertError.message };
  }

  // 3. Fan out to handlers
  await dispatchToHandlers(event);

  return { ok: true };
}

// ---- Dispatch ----

async function dispatchToHandlers(event: DomainEvent): Promise<void> {
  const relevant = handlers.filter((h) => h.eventType === event.eventType);
  if (relevant.length === 0) return;

  await Promise.allSettled(
    relevant.map(async (h) => {
      try {
        await h.handle(event, supabase);
        await supabase
          .from('domain_events')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('event_id', event.eventId);
      } catch (err: any) {
        console.error(`[EventBus] Handler ${h.name} failed for ${event.eventType}:`, err.message);
        await supabase
          .from('domain_events')
          .update({ error: err.message })
          .eq('event_id', event.eventId);
      }
    })
  );
}

// ---- Validation ----

function isValidEvent(raw: unknown): raw is DomainEvent {
  if (typeof raw !== 'object' || raw === null) return false;
  const e = raw as Record<string, unknown>;
  return (
    typeof e.eventId    === 'string' &&
    typeof e.eventType  === 'string' &&
    typeof e.tenantId   === 'string' &&
    typeof e.source     === 'string' &&
    typeof e.timestamp  === 'string' &&
    typeof e.version    === 'number' &&
    e.payload !== undefined
  );
}
