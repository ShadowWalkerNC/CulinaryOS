# CulinaryOS resilience operations runbook (R7/R8)

> **SYNTHETIC LOCAL MEASUREMENT ONLY.** Every command below runs against an
> explicitly configured local test target. Output is never a production
> capacity certification, disaster-recovery proof, or hardware certification.
> Live-rehearsal and hardware sections are labeled **NOT RUN** until executed
> against real binaries/devices with recorded evidence.

Scope: [R7 capacity/fairness/observability and R8 recovery/device rehearsal](ARCHITECTURE_RESILIENCE_PLAN.md)
harness operation. For architecture and stage gates see
`docs/ARCHITECTURE_RESILIENCE_PLAN.md`; for coordination see
`docs/AI_SHARED_LEDGER.md`.

Owned tooling (all self-contained, no repo imports, runnable via `tsx`):

| Tool | Purpose |
|---|---|
| `scripts/resilience-capacity.ts` | Bounded GET-only-by-default load harness: latency percentiles, in-flight pool pressure, queue-age probe, read-only DB pool probe |
| `scripts/resilience-recovery.ts` | Isolated backup/restore rehearsal: `pg_dump` a test DB, restore into a generated scratch DB, verify parity, drop only the scratch DB |
| `tests/server/resilience-operations.test.ts` | Guardrail/accounting suite for both tools (faked fetch/clock/processes) |

---

## 1. R7 — Local capacity harness

### 1.1 Exact commands

```powershell
# Read-only baseline against a local API (default plan: 200 requests, 10 concurrent):
node --import tsx scripts/resilience-capacity.ts --target-label "local-api-<date>"

# Custom target, explicit endpoint list, JSON report to file:
node --import tsx scripts/resilience-capacity.ts `
  --target-label "local-api-<date>" `
  --base-url http://127.0.0.1:3000 `
  --requests 1000 --concurrency 20 --timeout-ms 5000 `
  --endpoint GET:/health --endpoint GET:/v1/menu/golden-fork `
  --out ./capacity-report.json

# Optional queue-age probe (GET JSON carrying oldest_pending_age_ms):
node --import tsx scripts/resilience-capacity.ts --target-label "local-api" `
  --queue-age-probe /v1/ops/queue-age

# Optional read-only pool probe against an explicit TEST database:
$env:TEST_DATABASE_URL = "postgresql://postgres:<pw>@127.0.0.1:<port>/culinaryos_verification"
node --import tsx scripts/resilience-capacity.ts --target-label "local-api" --database-url $env:TEST_DATABASE_URL

# Opt-in fixture writes ONLY (both required, never by default):
$env:RESILIENCE_FIXTURES = "1"
node --import tsx scripts/resilience-capacity.ts --target-label "local-fixtures" `
  --allow-writes --endpoint POST:/v1/fixture/seed
```

### 1.2 Default read plan

`GET /health`, `GET /v1/menu/golden-fork`, `GET /v1/pantry`,
`GET /v1/settings` — each a real route mount in
`apps/server/src/index.ts:127-156` with repo callers
(`apps/admin/src/pages/Settings.tsx:86`, `apps/admin/src/pages/Pantry.tsx:81`,
`scripts/health-check.ts:59`).

### 1.3 Reading the report

- `http.latenciesMs`: count/min/max/mean plus nearest-rank p50/p95/p99 over
  completed requests only. Timeouts and errors are counted separately and
  never folded into timings.
- `http.statusCounts` / `perEndpoint`: failures stay visible; a 404/503 storm
  still measures server pressure but must be labeled as such, never as a
  successful capacity pass.
- `http.maxInFlight`: observed peak concurrency (pool-pressure proxy).
- `queueAgeMs`: `null` means NOT MEASURED (probe absent/unparseable), never zero.
- `database`: `measured:false` unless the explicit test-DB probe ran.
- Every report embeds the non-production disclaimer verbatim.

### 1.4 Guardrails (refusals exit 2)

- Loopback targets only (`127.0.0.1`, `::1`, `localhost`); LAN/remote refused.
- No credentials in target URLs; secrets redacted in all output.
- GET-only unless `--allow-writes` AND `RESILIENCE_FIXTURES=1` are both set.
- Bounded: requests 1–100000, concurrency 1–256, timeout 100–30000ms.
- DB probe accepts loopback test-named databases only
  (`culinaryos_verification`, `*_test`, `*_rehearsal`, `*_verification`,
  `rehearsal_*`, `test_*`); runs `SELECT 1` plus a waiting-backend count.

### 1.5 Historical reference (not a current pass)

`docs/benchmarks/perf_baseline.md` (2026-09-08, Node v26.4.0) recorded local
p95 < 25ms (`/health`) and < 50ms (API reads). That baseline predates the
current tree; re-measure with this harness before citing any number. A fresh
measured run is **NOT RUN** in this change (harness accounting is unit-tested;
no live target was loaded).

---

## 2. R8 — Isolated backup/restore rehearsal

### 2.1 Prerequisites

1. Isolated temp PostgreSQL binaries prepared (the rehearsal installs
   nothing and searches nothing on PATH). The repo provisioner is
   `scripts/start-postgres-verification.ps1`, which constrains its cluster to
   the OS temp directory and writes credentials only to a private temp state
   file (`test-env.json`, never committed or pasted into reports).
2. An explicit test connection string (`TEST_DATABASE_URL` or
   `--database-url`) pointing at a loopback test-named database.

### 2.2 Exact commands

```powershell
# Start the isolated cluster (loopback only, temp-contained):
powershell ./scripts/start-postgres-verification.ps1

# Read TEST_DATABASE_URL from the private temp state file, then rehearse:
node --import tsx scripts/resilience-recovery.ts `
  --bin-dir "<temp>\culinaryos-postgres-verification-<date>\runtime\pgsql\bin" `
  --target-label "local-rehearsal-<date>" `
  --database-url $env:TEST_DATABASE_URL

# Retain the scratch database for inspection (default drops it):
node --import tsx scripts/resilience-recovery.ts --bin-dir <bin> `
  --target-label "local-rehearsal" --keep-scratch

# Stop the cluster when done:
powershell ./scripts/start-postgres-verification.ps1 -Stop
```

### 2.3 What the rehearsal does and proves

Steps: `prepare-root` → `dump-source` (`pg_dump -Fc`, sha256 recorded) →
`create-scratch` → `restore-scratch` (`pg_restore`) → `verify-parity`
(public-schema inventory plus `count(*)` on up to `--verify-tables-max`
tables, default 25) → `drop-scratch`. Artifacts land in a temp-contained
rehearsal root with `plan.json` and `rehearsal-report.json`.

Hard limits, stated in every report: inventory + row-count parity only (not
row-byte equality); single loopback node; no retention/scheduling/encryption/
point-in-time coverage.

### 2.4 Guardrails (refusals exit 2; step failures exit 1)

- Loopback test-named databases only; production names, remote hosts, and the
  `postgres` maintenance DB as a dump source are refused.
- Rehearsal root must resolve inside the OS temp directory; the temp dir
  itself and sibling-prefix escapes are refused.
- Only generated `rehearsal_scratch_*` names are ever created or dropped. No
  pre-existing database is dropped or reset — including on failure paths.
- Passwords travel via `PGPASSWORD` environment only; every message, command
  line, and report passes through secret redaction.

### 2.5 Status: NOT RUN (live)

The rehearsal runner, guardrails, and parity accounting are unit-tested with
faked processes (`tests/server/resilience-operations.test.ts`). A live
dump/restore against a real temp cluster is **NOT RUN**: no PostgreSQL
binaries or verification cluster were present in this environment
(no `culinaryos*` temp state, no `pg_ctl`/`psql` on PATH as of 2026-10-01),
and this task performs no installs. Do not claim restore evidence until the
commands in 2.2 execute against real binaries with a recorded report.

---

## 3. Hardware printer/reader acceptance runbook — NOT RUN

> **Status: NOT RUN.** No printers, drawers, or readers were available to this
> task. Every step below is an exact procedure awaiting execution with
> recorded model/firmware traces. Dry-run byte checks and unit tests
> (`tests/hardware/*`, `scripts/verify-hardware.ts`) are byte-format checks,
> not device certification.

### 3.1 Acceptance bench (exact models)

Per `docs/HARDWARE_BOM_MATRIX.md` Blessed Kit v1:

| Station | Device | Interface under test | Firmware capture |
|---|---|---|---|
| FOH receipt | Star TSP143IV (alt: Epson TM-m30II), 80mm thermal, 48-col | LAN port 9100 raw ESC/POS | Printer self-test page (hold FEED at power-on): record model + firmware + IP |
| BOH kitchen | Star SP742 impact (alt: Epson TM-U220B), red/black ribbon RC700BR | LAN ESC/POS emulation | Self-test page: record model + firmware + emulation mode |
| Cash drawer | APG Vasario 1616 (24V, printer-driven RJ12 DK port) | DK pulse via FOH printer | Record drawer model + cable type (POS RJ12 6-pin; phone RJ11 forbidden) |
| Card reader | Stripe WisePOS E (alt: S700), Stripe Terminal SDK | Wi-Fi/Ethernet + offline mode | Record reader model + OS/firmware from Terminal SDK discovery output |

### 3.2 Printer acceptance (FOH, then repeat for BOH with red-ink checks)

```bash
# 1. Show the certified matrix (reference only, proves nothing about devices):
culinary hardware bom

# 2. Byte-format dry run (no device needed; validates payload construction):
culinary hardware test-receipt --ip <printer-ip> --port 9100 --dry-run
culinary hardware kick-drawer --ip <printer-ip> --port 9100 --dry-run

# 3. Live discovery + test receipt + drawer kick against the real device:
culinary hardware scan
culinary hardware test-receipt --ip <printer-ip> --port 9100
culinary hardware kick-drawer --ip <printer-ip> --port 9100 --pin 2

# 4. Independent byte-harness check (expects exit 0):
node --import tsx scripts/verify-hardware.ts
```

Record per device: timestamp, model, firmware (self-test photo/transcript),
IP, paper width, every command above with exit code and observed output.

Pass criteria (all required):

- [ ] `ESC @` init (`1B 40`) accepted; receipt prints with no garbled bytes.
- [ ] 48-column layout (80mm) holds alignment left/center; bold, underline,
      and inverse blocks render (`1B 45`, `1B 2D`, `1D 42` sequences).
- [ ] Partial cut fires (`1D 56 42 00`); feed advances before the cut.
- [ ] Drawer kick pulse `1B 70 00 19 FA` (Pin 2, 25ms ON / 250ms OFF) opens
      drawer 1; `--pin 5` pulse `1B 70 01 19 FA` opens drawer 2 where fitted.
- [ ] BOH only: red-ink modifier/allergy lines print in red; ticket survives
      10 minutes clipped at the pass (no thermal-blackening — impact only).
- [ ] Failure drill: unplug LAN mid-print, rerun `test-receipt`, confirm the
      CLI reports unreachable (no silent success) and the retry prints once.

### 3.3 Reader acceptance (Stripe Terminal)

```bash
# Exact reader procedure (Stripe test mode first; amounts in integer cents):
# 1. Discover + register the reader via the Terminal SDK; record model/OS/firmware.
# 2. Collect a $1.00 test payment (100 cents) end to end; record PaymentIntent id.
# 3. Enable Terminal offline mode; disconnect network; collect $2.00 (200 cents);
#    reconnect; confirm the intent forwards and capture state reconciles once.
# 4. Refund both test intents; confirm no duplicate capture in the dashboard.
```

Pass criteria (all required):

- [ ] Reader model + firmware recorded from SDK discovery (not assumed).
- [ ] Online $1.00 intent: collected, captured, exactly one ledger entry.
- [ ] Offline $2.00 intent: queued locally, forwarded on reconnect, captured
      at most once; POS never marks the tab paid before provider confirmation.
- [ ] No PAN/CVV in CulinaryOS logs, storage, or error output (grep the run
      logs for `4\d{15}`-class patterns and CVV fields; expect zero hits).
- [ ] Webhook signature verification exercised for the test intents.

### 3.4 What remains NOT RUN

All of sections 3.2–3.3: no device was reachable, so no model/firmware trace,
no printed artifact, no drawer actuation, and no reader intent exists. The
`--dry-run` byte checks and `tests/hardware/*` suites validate payload bytes
only.

---

## 4. Unresolved release gates

These gate any pilot/release claim; this change resolves none of them:

1. **R2 identity/tenancy proof** — real disposable-PostgreSQL two-tenant
   allow/deny, pooled-connection isolation, revoked/expired device handling,
   RLS negative controls (owned by parallel DB tasks; not this change).
2. **Live capacity evidence** — a measured rush against a real local target
   with p95/p99, pool waits, event lag, and queue age (§1.5 NOT RUN).
3. **Live restore evidence** — a real temp-cluster dump/restore/verify cycle
   with a recorded report (§2.5 NOT RUN).
4. **Exact-device certification** — printer/drawer/reader acceptance with
   model/firmware traces (§3 NOT RUN).
5. **Payment-provider traces** — Stripe test-account intent/webhook/refund
   evidence with idempotency and cap proofs (R5 scope).
6. **Offline conflict proof** — restart/quota/two-device replay with
   same-operation-ID conflict rejection (R4 scope, parallel offline tasks).
7. **Full-service integrity** — split/coursing/cash-close fixtures (R6 scope).

---

## 5. Verification log (this change)

- `tests/server/resilience-operations.test.ts`: 34 tests covering percentile
  math, sequential latency exactness, concurrency accounting (maxInFlight),
  timeout/error separation, queue-age and DB probe aggregation, loopback and
  test-database guardrails (incl. IPv6 `[::1]`), write opt-in, rehearsal-root
  containment, binary verification, scratch-name guards, parity
  pass/mismatch/drop-failure paths, and secret redaction — **PASS**.
- Live capacity run, live restore rehearsal, and hardware acceptance:
  **NOT RUN** (no live target/binaries/devices; no installs per task bounds).
- Existing artifacts preserved; no DB, server, offline, manifest, or
  deployment edits in this scope.

