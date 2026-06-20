# Sprint 9 — Beta Launch Checklist (Week 24)

## Pre-Launch (Complete before going live)
- [ ] Run `northern_fixins_demo.ts` seed against production Supabase
- [ ] Verify all 19 menu items appear at `northernfixins.culinaryos.com`
- [ ] Confirm Maine 8% meals tax calculating correctly on all food items
- [ ] Run full 48-hour offline chaos test suite (T01–T08) — all must pass
- [ ] Stripe Terminal: process one live $0.01 test payment — confirm receipt + KDS ticket
- [ ] Confirm PowerSync sync queue clears after reconnect (T06)
- [ ] Confirm audit log has zero gaps after 48h offline simulation (T08)
- [ ] Deploy `supabase/functions/ai/` Edge Function to production
- [ ] Deploy `supabase/migrations/20260620_ai_prompt_log.sql`
- [ ] Deploy `supabase/migrations/20260620_beta_applications.sql`
- [ ] Publish `/beta` signup page at culinaryos.com/beta
- [ ] Verify beta form submits to `beta_applications` table
- [ ] Setup Health Score shows 100/100 on Northern Fixins demo account

## Launch Day
- [ ] Publish culinaryos.com/beta live
- [ ] Post beta announcement (Bangor Facebook groups, local operator contacts)
- [ ] Send personal outreach to 10 Bangor operators (text/call — not email)
- [ ] Kickstarter campaign page goes live
- [ ] Northern Fixins demo walkthrough video posted

## Beta Admission Criteria (8–12 operators)
- Independent operator — not a chain or franchise
- Located in Maine preferred — other New England accepted
- Currently on Square, Toast, or paper (switching motivation exists)
- Willing to do a 30-minute onboarding call with Nate
- Willing to provide honest feedback weekly

## Founding Customer Gate
- First 5 operators who convert to any paid tier after beta
- Receive Enterprise tier features, forever, at no additional charge
- Documented in subscription agreement, published on website
- Badge applied to account permanently

## Week 24 Success Metrics
| Metric | Target |
|---|---|
| Beta applications received | 15+ |
| Operators admitted | 8–12 |
| Chaos test pass rate | 8/8 (100%) |
| Demo instance uptime | 99.9% |
| Onboarding calls completed | 8+ |
| Founding customers identified | 2–3 |
