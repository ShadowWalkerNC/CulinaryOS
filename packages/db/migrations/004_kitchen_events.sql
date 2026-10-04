-- ============================================================
-- CulinaryOS pg-foundation 004 — kitchen tickets, event bus, push outbox
-- Ported from V2 (+V8 course columns), V5 domain_events, V12 pending_push.
-- Additive deltas: ticket_items.tenant_id with composite FKs (same-tenant
-- ticket/line linkage), composite ticket->order FK. Realtime publication
-- membership is intentionally dropped (server-owned push replaces it).
-- ============================================================

CREATE TABLE public.kitchen_tickets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id          uuid NOT NULL,
  order_number      int NOT NULL,
  station           text NOT NULL CHECK (station IN ('hot','cold','grill','fry','sauce','pastry','pass','bar')),
  status            text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','fired','cooking','bumped','recalled','voided')),
  priority          text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','rush','allergy')),
  table_number      text,
  cover_count       int,
  course_number     int NOT NULL DEFAULT 1,
  course_hold_status text NOT NULL DEFAULT 'firing' CHECK (course_hold_status IN ('held','firing','fired')),
  notes             text,
  void_reason       text,
  held_at           timestamptz,
  fired_at          timestamptz,
  bumped_at         timestamptz,
  cook_time_seconds int,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  CONSTRAINT fk_kt_order FOREIGN KEY (tenant_id, order_id)
    REFERENCES public.pos_orders(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_kt_tenant_status ON public.kitchen_tickets(tenant_id, status);
CREATE INDEX idx_kt_tenant_station ON public.kitchen_tickets(tenant_id, station, status);
CREATE INDEX idx_kt_order ON public.kitchen_tickets(order_id);
CREATE INDEX idx_kt_course ON public.kitchen_tickets(order_id, course_number);

CREATE TABLE public.ticket_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL,
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  line_item_id uuid NOT NULL,
  name         text NOT NULL,
  quantity     int NOT NULL DEFAULT 1,
  modifiers    text[] NOT NULL DEFAULT '{}',
  notes        text,
  sort_order   int NOT NULL DEFAULT 0,
  CONSTRAINT fk_ticket_items_ticket FOREIGN KEY (tenant_id, ticket_id)
    REFERENCES public.kitchen_tickets(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_items_line_item FOREIGN KEY (tenant_id, line_item_id)
    REFERENCES public.pos_order_line_items(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_ticket_items_ticket ON public.ticket_items(ticket_id, sort_order);

CREATE TRIGGER trg_kt_updated_at BEFORE UPDATE ON public.kitchen_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- Domain event log (V5) ----
CREATE TABLE public.domain_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL UNIQUE,
  event_type   text NOT NULL,
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source       text NOT NULL,
  version      int NOT NULL DEFAULT 1,
  payload      jsonb NOT NULL,
  processed    boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_de_tenant_type ON public.domain_events(tenant_id, event_type);
CREATE INDEX idx_de_unprocessed ON public.domain_events(processed, created_at) WHERE processed = false;
CREATE INDEX idx_de_created ON public.domain_events(created_at DESC);

-- ---- Pending-push outbox for KDS reconnect catch-up (V12) ----
CREATE TABLE public.pending_push (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  station_id   text,
  event_type   text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
CREATE INDEX idx_pending_push_tenant_undelivered
  ON public.pending_push (tenant_id, created_at)
  WHERE delivered_at IS NULL;

-- ---- RLS (enabled + forced on every table) ----
ALTER TABLE public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_tickets FORCE ROW LEVEL SECURITY;
CREATE POLICY "kt_select" ON public.kitchen_tickets FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "kt_insert" ON public.kitchen_tickets FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "kt_update" ON public.kitchen_tickets FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "kt_delete" ON public.kitchen_tickets FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_items FORCE ROW LEVEL SECURITY;
CREATE POLICY "ti_select" ON public.ticket_items FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "ti_insert" ON public.ticket_items FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "ti_update" ON public.ticket_items FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "ti_delete" ON public.ticket_items FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "de_select" ON public.domain_events FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "de_insert" ON public.domain_events FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "de_update" ON public.domain_events FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "de_delete" ON public.domain_events FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.pending_push ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_push FORCE ROW LEVEL SECURITY;
CREATE POLICY "pp_select" ON public.pending_push FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "pp_insert" ON public.pending_push FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "pp_update" ON public.pending_push FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "pp_delete" ON public.pending_push FOR DELETE USING (tenant_id = public.app_tenant_id());

-- ---- Grants ----
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.kitchen_tickets, public.ticket_items,
  public.domain_events, public.pending_push
  TO culinaryos_app;
