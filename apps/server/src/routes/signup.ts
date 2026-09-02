// ============================================================
// CulinaryOS — Restaurant Signup / Onboarding Route
// POST /v1/auth/signup  — public, no requireTenant
//   Creates Supabase Auth user, restaurants row, and initial
//   trial subscriptions row. Falls back gracefully in demo mode.
// ============================================================

import { Hono } from 'hono';
import type { Context } from 'hono';
import { ok, err }            from '../middleware/auth.js';
import { adminSupabase }      from '../middleware/supabase.js';
import { isLiveSupabaseConfigured } from '../lib/secrets.js';
import type { Env } from '../types.js';

export const signupRoutes = new Hono<Env>();

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

// ---- POST /v1/auth/signup ----------------------------------------------------

signupRoutes.post('/signup', async (c: Context<Env>) => {
  const body = await c.req.json<{
    email?:           string;
    password?:        string;
    restaurant_name?: string;
    timezone?:        string;
  }>().catch(() => null);

  if (!body) {
    return err(c, 'VALIDATION_ERROR', 'Request body must be valid JSON', 400);
  }

  const { email, password, restaurant_name, timezone } = body;

  // ---- Validation -------------------------------------------------------------
  if (!email || !email.includes('@')) {
    return err(c, 'VALIDATION_ERROR', 'A valid email address is required', 422);
  }
  if (!password || password.length < 8) {
    return err(c, 'VALIDATION_ERROR', 'Password must be at least 8 characters', 422);
  }
  if (!restaurant_name || !restaurant_name.trim()) {
    return err(c, 'VALIDATION_ERROR', 'restaurant_name is required', 422);
  }

  // ---- Demo / offline mode ----------------------------------------------------
  if (!isLiveSupabaseConfigured()) {
    return ok(c, {
      success:   true,
      tenant_id: DEMO_TENANT,
      demo_mode: true,
      message:   'Demo account created. Set SUPABASE_SERVICE_ROLE_KEY and run pnpm seed for live auth.',
    }, 201);
  }

  // ---- Live Supabase path -----------------------------------------------------
  const admin = adminSupabase();
  if (!admin) {
    return err(c, 'SERVICE_UNAVAILABLE', 'Auth backend unavailable', 503);
  }

  // 1. Create Supabase Auth user (email confirmed immediately)
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userErr || !userData?.user) {
    const msg = userErr?.message ?? 'Failed to create user';
    // Surface duplicate-email error clearly
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate')) {
      return err(c, 'CONFLICT', 'An account with this email already exists', 409);
    }
    return err(c, 'AUTH_ERROR', msg, 500);
  }

  const userId = userData.user.id;

  // 2. Create restaurants row
  const { data: restaurant, error: restaurantErr } = await admin
    .from('restaurants')
    .insert({
      name:                restaurant_name.trim(),
      owner_id:            userId,
      timezone:            timezone ?? 'America/New_York',
      subscription_status: 'trial',
    })
    .select('id')
    .single();

  if (restaurantErr || !restaurant) {
    // Roll back auth user to avoid orphaned accounts
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return err(c, 'DB_ERROR', restaurantErr?.message ?? 'Failed to create restaurant', 500);
  }

  const tenantId = restaurant.id as string;

  // 3. Create initial trial subscription row (14-day trial)
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  try {
    await admin
      .from('subscriptions')
      .insert({
        tenant_id:     tenantId,
        plan:          'trial',
        status:        'trialing',
        trial_ends_at: trialEndsAt,
      });
  } catch (e: any) {
    console.warn('[signup] Failed to create trial subscription:', e.message);
  }

  // 4. Add owner to tenant_users (if table exists)
  try {
    await admin
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id:   userId,
        role:      'owner',
      });
  } catch {
    // table may not have this column in all migrations — non-fatal
  }

  return ok(c, {
    success:   true,
    tenant_id: tenantId,
    user_id:   userId,
    message:   'Account created. Check your email to verify.',
  }, 201);
});
