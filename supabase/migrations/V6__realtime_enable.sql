-- ============================================================
-- CulinaryOS V6 — Enable Supabase Realtime on relevant tables
-- Run this after deploying to Supabase
-- ============================================================

-- Enable realtime publication for KDS + POS tables
alter publication supabase_realtime add table public.kitchen_tickets;
alter publication supabase_realtime add table public.pos_orders;
alter publication supabase_realtime add table public.domain_events;

-- Note: ticket_items and pos_order_line_items are NOT in the publication
-- because clients always refetch the full ticket/order on ticket/order update.
-- Adding them would double the noise with no benefit.
