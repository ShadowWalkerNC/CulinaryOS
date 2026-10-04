-- ============================================================
-- CulinaryOS pg-foundation 005 — payments, idempotency, audit, drawer
-- Ported from V3 payments (+V10 Stripe columns). New owned tables:
-- operation_receipts (sync-delta idempotency), stripe_webhook_inbox
-- (durable inbox before ack), audit_logs (append-only ledger matching the
-- server AuditLogRecord shape), drawer_sessions (cash close-out).
-- Money is integer cents; cumulative refunds are capped per payment row.
-- No card data anywhere (processor references only).
-- ============================================================

-- ---- Payments (V3 + V10 + idempotency + refund cap) ----
CREATE TABLE public.payments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id                  uuid NOT NULL,
  amount                    int NOT NULL CHECK (amount >= 0),
  method                    text NOT NULL CHECK (method IN ('cash','card','split','comp','gift_card')),
  status                    text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','refunded','failed')),
  tip_amount                int NOT NULL DEFAULT 0 CHECK (tip_amount >= 0),
  tip_cents                 int NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
  refunded_cents            int NOT NULL DEFAULT 0 CHECK (refunded_cents >= 0),
  reference_id              text,
  idempotency_key           text,
  stripe_payment_intent_id  text UNIQUE,
  stripe_client_secret      text,
  receipt_sent_at           timestamptz,
  receipt_email             text,
  failure_message           text,
  processed_at              timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_payments_refund_cap CHECK (refunded_cents <= amount),
  UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT fk_payments_order FOREIGN KEY (tenant_id, order_id)
    REFERENCES public.pos_orders(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_tenant ON public.payments(tenant_id, status);
CREATE INDEX idx_payments_intent ON public.payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- ---- Operation receipts (durable sync-delta idempotency) ----
-- Same (tenant, operation_key) + different request_hash => conflict is a
-- server decision; the unique key makes double-apply impossible.
CREATE TABLE public.operation_receipts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  operation_key text NOT NULL,
  request_hash  text NOT NULL,
  status        text NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted','applied','conflict','failed')),
  result        jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, operation_key)
);
CREATE INDEX idx_operation_receipts_tenant ON public.operation_receipts(tenant_id, status);
CREATE TRIGGER trg_operation_receipts_updated_at BEFORE UPDATE ON public.operation_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- Stripe webhook inbox (persist before ack; dedupe by event id) ----
-- tenant_id is NOT NULL: the signature-verified route resolves the tenant
-- from the event before inserting. Unresolvable events are rejected, never
-- stored unattributed.
CREATE TABLE public.stripe_webhook_inbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_event_id text NOT NULL UNIQUE,
  event_type      text NOT NULL,
  status          text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','processed','failed')),
  payload         jsonb NOT NULL,
  error           text,
  received_at     timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz
);
CREATE INDEX idx_webhook_inbox_tenant ON public.stripe_webhook_inbox(tenant_id, status);

-- ---- Audit log (append-only; matches server AuditLogRecord) ----
CREATE TABLE public.audit_logs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  manager_id         uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  manager_name       text NOT NULL DEFAULT 'Manager',
  action             text NOT NULL,
  target_type        text NOT NULL,
  target_id          text,
  reason_code        text,
  reason_description text,
  amount_cents       int,
  notes              text,
  metadata           jsonb NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id, created_at DESC);

-- ---- Drawer sessions (cash float open/count/close per drawer) ----
CREATE TABLE public.drawer_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  drawer_name           text NOT NULL DEFAULT 'main',
  status                text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_by             uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  closed_by             uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  opened_at             timestamptz NOT NULL DEFAULT now(),
  closed_at             timestamptz,
  opening_float_cents   int NOT NULL DEFAULT 0 CHECK (opening_float_cents >= 0),
  cash_sales_cents      int NOT NULL DEFAULT 0 CHECK (cash_sales_cents >= 0),
  paid_in_cents         int NOT NULL DEFAULT 0 CHECK (paid_in_cents >= 0),
  paid_out_cents        int NOT NULL DEFAULT 0 CHECK (paid_out_cents >= 0),
  counted_cents         int CHECK (counted_cents IS NULL OR counted_cents >= 0),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_drawer_sessions_one_open
  ON public.drawer_sessions(tenant_id, drawer_name) WHERE status = 'open';
CREATE TRIGGER trg_drawer_sessions_updated_at BEFORE UPDATE ON public.drawer_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- RLS (enabled + forced on every table) ----
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "payments_insert" ON public.payments FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "payments_update" ON public.payments FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "payments_delete" ON public.payments FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.operation_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY "or_select" ON public.operation_receipts FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "or_insert" ON public.operation_receipts FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "or_update" ON public.operation_receipts FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "or_delete" ON public.operation_receipts FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.stripe_webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_inbox FORCE ROW LEVEL SECURITY;
CREATE POLICY "wi_select" ON public.stripe_webhook_inbox FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "wi_insert" ON public.stripe_webhook_inbox FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "wi_update" ON public.stripe_webhook_inbox FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "wi_delete" ON public.stripe_webhook_inbox FOR DELETE USING (tenant_id = public.app_tenant_id());

-- Append-only ledger: no update/delete policies and no such grants.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY "al_select" ON public.audit_logs FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "al_insert" ON public.audit_logs FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());

ALTER TABLE public.drawer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawer_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY "ds_select" ON public.drawer_sessions FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "ds_insert" ON public.drawer_sessions FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "ds_update" ON public.drawer_sessions FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "ds_delete" ON public.drawer_sessions FOR DELETE USING (tenant_id = public.app_tenant_id());

-- ---- Grants ----
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.payments, public.operation_receipts,
  public.stripe_webhook_inbox, public.drawer_sessions
  TO culinaryos_app;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO culinaryos_app;
