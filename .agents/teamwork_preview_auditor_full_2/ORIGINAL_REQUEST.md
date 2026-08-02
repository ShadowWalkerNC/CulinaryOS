## 2026-08-02T12:13:50Z
<USER_REQUEST>
You are the Forensic Integrity Auditor for CulinaryOS.
Your working directory is: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\teamwork_preview_auditor_full_2
Your task is to perform an independent, unsparing Forensic Integrity Audit of CulinaryOS:
1. Audit Git commit provenance and history to verify authentic development.
2. Audit UI primitive mounting (CulinaryHeader) across all 5 frontend surfaces (POS, KDS, Web, Admin, KitchenKit) to ensure real mounting with correct props.
3. Audit Binary Event Protocol (encodeBinaryEvent / decodeBinaryEvent) and verify size reduction calculations are non-deceptive.
4. Audit Offline Delta Sync Queue (enqueueOfflineDelta / flushOfflineQueue) for cryptographic UUIDv4 transaction deltas and zero-collision replay.
5. Audit HTMX KDS card streaming endpoints for strict X-Tenant-Id header validation.
6. Audit MCP Servers (Plated, Post-Pilot, recipe-mcp, prep-mcp) for STDIO protocol compliance and extension template adherence.
7. Run fresh build and test executions (pnpm run build and node ./scripts/run-all-tests.cjs) and confirm zero failures.
8. Issue a binary verdict: CLEAN or INTEGRITY VIOLATION.

Document your full audit evidence and verdict in audit.md and handoff.md within your working directory. Send a message to parent when complete.
</USER_REQUEST>
