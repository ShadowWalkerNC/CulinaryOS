// ============================================================
// KDS — /v1/stations routes
//
// GET /v1/stations/summary   ticket count per station
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../../../backend/middleware/auth';

const app = new Hono();

app.get('/summary', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  const { data, error } = await supabase
    .from('station_summary')
    .select('station, active_count, bumped_count, avg_cook_seconds')
    .eq('tenant_id', tenantId);

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);

  // Return as { hot: 3, cold: 1, ... } for easy consumption
  const summary: Record<string, number> = {};
  for (const row of data ?? []) {
    summary[row.station] = Number(row.active_count);
  }
  return ok(c, summary);
});

app.get('/detail', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  const { data, error } = await supabase
    .from('station_summary')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

export { app as stationRoutes };
