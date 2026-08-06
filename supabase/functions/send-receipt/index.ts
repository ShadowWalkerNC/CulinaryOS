// ============================================================
// CulinaryOS — send-receipt Edge Function (Deno)
// Internal-only: requires service role or INTERNAL_API_KEY.
// ============================================================

import { serve }        from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INTERNAL_API_KEY = Deno.env.get('INTERNAL_API_KEY') ?? '';

function cents(n: number): string {
  return `$${(n / 100).toFixed(2)}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function authorize(req: Request): boolean {
  const auth = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!auth) return false;
  if (auth === SERVICE_ROLE_KEY) return true;
  if (INTERNAL_API_KEY && auth === INTERNAL_API_KEY) return true;
  return false;
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  if (!authorize(req)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { payment_id, order_id, amount_cents, tip_cents, receipt_email, tenant_id } =
    await req.json();

  if (!payment_id || !order_id || !receipt_email || !tenant_id) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Verify payment ↔ order ↔ tenant before sending
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .select('id, order_id, tenant_id, receipt_email, amount')
    .eq('id', payment_id)
    .eq('tenant_id', tenant_id)
    .eq('order_id', order_id)
    .single();

  if (payErr || !payment) {
    return new Response(JSON.stringify({ ok: false, error: 'Payment not found for tenant' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: order } = await supabase
    .from('pos_orders')
    .select('order_number, table_number, pos_order_line_items(name, quantity, unit_price, line_total)')
    .eq('id', order_id)
    .eq('tenant_id', tenant_id)
    .single();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenant_id)
    .single();

  const restaurantName = escapeHtml(tenant?.name ?? 'CulinaryOS Restaurant');
  const orderNum       = escapeHtml(order?.order_number ?? '—');
  const tableNum       = escapeHtml(order?.table_number ?? '—');
  const lines          = order?.pos_order_line_items ?? [];
  const subtotal       = amount_cents - tip_cents;

  const lineRows = lines.map((l: any) =>
    `<tr>
      <td style="padding:4px 8px;">${escapeHtml(l.quantity)}x ${escapeHtml(l.name)}</td>
      <td style="padding:4px 8px;text-align:right;">${cents(l.line_total)}</td>
    </tr>`
  ).join('\n');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt</title></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111;">
  <h2 style="margin-bottom:4px;">${restaurantName}</h2>
  <p style="color:#666;font-size:13px;">Order #${orderNum} · Table ${tableNum}</p>
  <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tbody>${lineRows}</tbody>
    <tfoot>
      <tr><td style="padding:8px;border-top:1px solid #eee;">Subtotal</td>
          <td style="padding:8px;text-align:right;border-top:1px solid #eee;">${cents(subtotal)}</td></tr>
      ${tip_cents > 0 ? `<tr><td style="padding:4px 8px;">Tip</td><td style="padding:4px 8px;text-align:right;">${cents(tip_cents)}</td></tr>` : ''}
      <tr style="font-weight:bold;">
        <td style="padding:8px;border-top:2px solid #111;">Total</td>
        <td style="padding:8px;text-align:right;border-top:2px solid #111;">${cents(amount_cents)}</td>
      </tr>
    </tfoot>
  </table>
  <p style="font-size:12px;color:#999;margin-top:24px;text-align:center;">Thank you for dining with us.</p>
</body></html>`;

  const text = [
    tenant?.name ?? 'CulinaryOS Restaurant',
    `Order #${order?.order_number ?? '—'} · Table ${order?.table_number ?? '—'}`,
    '',
    ...lines.map((l: any) => `${l.quantity}x ${l.name} — ${cents(l.line_total)}`),
    '',
    `Subtotal: ${cents(subtotal)}`,
    tip_cents > 0 ? `Tip:      ${cents(tip_cents)}` : null,
    `Total:    ${cents(amount_cents)}`,
    '',
    'Thank you for dining with us.',
  ].filter(Boolean).join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    `${tenant?.name ?? 'CulinaryOS'} <receipts@culinaryos.app>`,
      to:      [receipt_email],
      subject: `Your receipt from ${tenant?.name ?? 'CulinaryOS'} — ${cents(amount_cents)}`,
      html,
      text,
    }),
  });

  const result = await res.json();
  if (!res.ok) {
    console.error('[send-receipt] Resend error:', result);
    return new Response(JSON.stringify({ ok: false, error: result }), { status: 500 });
  }

  await supabase
    .from('payments')
    .update({ receipt_sent_at: new Date().toISOString() })
    .eq('id', payment_id)
    .eq('tenant_id', tenant_id);

  return new Response(JSON.stringify({ ok: true, resend_id: result.id }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
