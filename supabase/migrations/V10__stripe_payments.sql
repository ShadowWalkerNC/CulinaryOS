-- ============================================================
-- CulinaryOS V10 — Stripe Payment Columns
-- Extends V3 payments without rebuilding it.
-- ============================================================

-- Stripe identifiers per tenant
alter table public.tenants
  add column if not exists stripe_customer_id  text,
  add column if not exists stripe_account_id   text;

-- Extend payments table
alter table public.payments
  add column if not exists stripe_payment_intent_id  text unique,
  add column if not exists stripe_client_secret       text,
  add column if not exists tip_cents                  int not null default 0,
  add column if not exists receipt_sent_at            timestamptz,
  add column if not exists receipt_email              text,
  add column if not exists failure_message            text;

create index if not exists idx_payments_intent
  on public.payments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Extend pos_orders with closed_at + covers (used by reports)
alter table public.pos_orders
  add column if not exists closed_at   timestamptz,
  add column if not exists covers      int not null default 1,
  add column if not exists total_cents int generated always as (total) stored;

-- Trigger: stamp closed_at when order goes to paid or voided
create or replace function public.set_order_closed_at()
returns trigger language plpgsql as $$
begin
  if NEW.status in ('paid', 'voided') and OLD.status not in ('paid', 'voided') then
    NEW.closed_at := now();
  end if;
  return NEW;
end;
$$;

create trigger trg_order_closed_at
  before update on public.pos_orders
  for each row execute function public.set_order_closed_at();

-- Realtime: POS reacts to capture confirmation live
alter publication supabase_realtime add table public.payments;
