// ============================================================
// CulinaryOS Event Broker
// Routes incoming domain events to registered handlers.
// ============================================================

import { createClient }           from '@supabase/supabase-js';
import { handleOrderCreated }     from './handlers/pos-order-created';
import { handleTicketBumped }     from './handlers/kds-ticket-bumped';
import { handleOrderCancelled }   from './handlers/pos-order-cancelled';
import { handleMenuItemSold }     from './handlers/pos-menu-item-sold';
import { handleCourseFired }      from './handlers/kds-course-fired';
import type { DomainEvent }       from './types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HANDLERS: Record<string, (event: any, supabase: any) => Promise<void>> = {
  'pos:order:created':         handleOrderCreated,
  'kds:ticket:bumped':         handleTicketBumped,
  'pos:order:cancelled':       handleOrderCancelled,
  'pos:menu:item-sold':        handleMenuItemSold,
  'kds:course:fired':          handleCourseFired,
};

export async function handleIncomingEvent(
  raw: unknown
): Promise<{ ok: boolean; error?: string }> {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Invalid event envelope: must be a non-null object' };
  }

  const event = raw as Record<string, unknown>;
  const required = ['eventId', 'eventType', 'tenantId', 'source', 'timestamp', 'version'];
  for (const field of required) {
    if (!(field in event)) {
      return { ok: false, error: `Invalid event envelope: missing field "${field}"` };
    }
  }

  const domainEvent = raw as DomainEvent<unknown>;

  // Write to domain_events ledger
  await supabase.from('domain_events').insert({
    event_id:   domainEvent.eventId,
    event_type: domainEvent.eventType,
    tenant_id:  domainEvent.tenantId,
    source:     domainEvent.source,
    version:    domainEvent.version,
    payload:    domainEvent.payload,
    processed:  false,
  });

  const handler = HANDLERS[domainEvent.eventType];
  if (!handler) {
    console.log(`[broker] No handler for event type: ${domainEvent.eventType}`);
    return { ok: true };
  }

  try {
    await handler(domainEvent, supabase);
    await supabase
      .from('domain_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('event_id', domainEvent.eventId);
    return { ok: true };
  } catch (e: any) {
    const errMsg = e?.message ?? String(e);
    console.error(`[broker] Handler error for ${domainEvent.eventType}:`, errMsg);
    await supabase
      .from('domain_events')
      .update({ error: errMsg })
      .eq('event_id', domainEvent.eventId);
    return { ok: false, error: errMsg };
  }
}
