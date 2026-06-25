-- CulinaryOS — Flyway Baseline Migration
-- V1: Empty baseline. Schema will be built phase by phase.
--
-- Phase 1 migrations: V2__auth_tenant.sql
-- Phase 2 migrations: V3__pos_core.sql
-- Phase 3 migrations: V4__kds.sql
-- Phase 4 migrations: V5__online_ordering.sql
-- Phase 5 migrations: V6__inventory.sql
-- Phase 6 migrations: V7__reporting.sql
-- Phase 7 migrations: V8__payments.sql
--
-- Add new migrations as new numbered files. Never edit existing migrations.
-- Flyway will refuse to run if a committed migration is modified.

SELECT 1; -- no-op baseline
