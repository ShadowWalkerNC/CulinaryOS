# CulinaryOS tasks

Master checklist and acceptance: docs/HYBRID_RELEASE_PLAN.md.

- [x] CULINARYOS-101: map hybrid product/deployment boundaries and resumable checklist (Codex, 2026-11-10).
- [x] CULINARYOS-102: installer false-success fixes implemented; validation recorded in HANDOFF.md.
- [x] CULINARYOS-103A: migrate two disposable PostgreSQL databases and verify atomic first-owner/runtime bootstrap, real auth and isolation checks.
- [x] CULINARYOS-103B: production API startup and restart verified over loopback HTTP with runtime credentials, persistent owner session, and saved order.
- [ ] CULINARYOS-104 through 110: workflow parity, production distribution, installer artifacts, managed provisioning, entitlements, preview release, human acceptance.

Product decisions pending: local feature matrix, supported server OS versions, commercial tiers/cost target. No need to split repos for deployment modes.
