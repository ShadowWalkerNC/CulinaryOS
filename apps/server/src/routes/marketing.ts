// ============================================================
// CulinaryOS — Marketing Campaign Studio & Post-Pilot Routes
// Milestone 6.5: 5 Marketing Skills & Campaign Post Scheduler
// ============================================================

import { Hono } from 'hono';
import { ok, err, requireTenant } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const marketingRoutes = new Hono<Env>();

marketingRoutes.use('*', requireTenant);

export interface MarketingPostRecord {
  id: string;
  tenantId: string;
  channel: string;
  content: string;
  scheduledAt: string;
  skill?: 'brand_guard' | 'event_campaign' | 'review_reply' | 'special_post' | 'weekly_plan';
  status: 'scheduled' | 'published' | 'draft';
  createdAt: string;
}

const MARKETING_SKILLS = [
  { id: 'brand_guard', name: 'Brand Voice & Tone Guard', description: 'Enforces brand vocabulary and prohibits discount-heavy phrasing' },
  { id: 'event_campaign', name: 'Tasting & Event Campaign Builder', description: 'Generates multi-day countdown posts for wine dinners and pop-ups' },
  { id: 'review_reply', name: 'Hospitality Review Responder', description: 'Drafts empathetic, brand-aligned responses to guest reviews' },
  { id: 'special_post', name: 'Daily Chef Special & 86 Surplus Push', description: 'Promotes high-margin chef specials and surplus prep items' },
  { id: 'weekly_plan', name: '7-Day Content & Daypart Calendar', description: 'Schedules brunch, happy hour, and dinner posts across channels' },
];

const scheduledPosts: MarketingPostRecord[] = [
  {
    id: 'mpost-001',
    tenantId: '00000000-0000-0000-0000-000000000001',
    channel: 'instagram',
    content: 'Wood-Fired Margherita & Local Hazy IPA Happy Hour starts at 4 PM!',
    scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
    skill: 'special_post',
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  },
];

marketingRoutes.get('/skills', (c) => {
  return ok(c, MARKETING_SKILLS);
});

marketingRoutes.get('/posts', (c) => {
  const tenantId = c.get('tenantId');
  const list = scheduledPosts.filter((p) => p.tenantId === tenantId || p.tenantId === '00000000-0000-0000-0000-000000000001');
  return ok(c, list);
});

marketingRoutes.post('/posts', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json<{ channel?: string; content?: string; scheduledAt?: string; skill?: MarketingPostRecord['skill'] }>().catch(() => ({} as { channel?: string; content?: string; scheduledAt?: string; skill?: MarketingPostRecord['skill'] }));

  if (!body.channel || !body.content || !body.scheduledAt) {
    return err(c, 'VALIDATION_ERROR', 'channel, content, and scheduledAt are required', 422);
  }

  const post: MarketingPostRecord = {
    id: `mpost-${Date.now()}`,
    tenantId,
    channel: body.channel.trim(),
    content: body.content.trim(),
    scheduledAt: body.scheduledAt,
    skill: body.skill ?? 'special_post',
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };

  scheduledPosts.unshift(post);
  return ok(c, post, 201);
});

export default marketingRoutes;
