# CulinaryOS decisions

## 2026-11-10: confirmed requirements

Private standalone local server plus operator-managed Railway SaaS; each approved SaaS customer receives a separate database. No Muse dependency for current work. Existing unit-tenant RLS and payment safety remain mandatory.

## 2026-11-10: implementation direction

Retain monorepo and separate deployment artifacts. Proposed initial SaaS topology is API/database per customer, matching the current one-pool API. Control plane, entitlements and supported install targets require their own implementation/acceptance stages. See docs/HYBRID_RELEASE_PLAN.md for tradeoffs.

Git is the accepted versioned instruction/code record. Docs/Drive are proposed collaboration/artifact surfaces with reviewed import into Git, not unsupervised instruction replacement. No new pricing or feature restrictions approved by this document.
