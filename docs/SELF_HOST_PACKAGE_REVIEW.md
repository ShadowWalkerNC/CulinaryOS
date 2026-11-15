# Self-Host Package Review — Docker, Compose, Installers, LAN, Secrets

- Owner: Muse. Scope: `docs/SELF_HOST_PACKAGE_REVIEW.md` only.
- Method: read-only source/package assessment. No application edits, no secret reads, no deployment, no database writes. Existing work preserved.
- Baseline: `4ca345f` (2026-10-28, `feat(platform): complete stages 10-14 …`). Working tree otherwise clean except a pre-existing local modification to `docs/AI_SHARED_LEDGER.md` (not mine, untouched).
- Date: 2026-10-31. Release context: user's three deliverables are self-hosted package, free Railway SaaS beta, and separate marketing (see `docs/AI_SHARED_LEDGER.md` "2026-10-31 Release finalization").

## Verdict

The self-host path boots a single-machine **demo** reliably (compose + quickstart + turnkey installer agree on ports and profiles), but it is **not shippable as a live-restaurant package**. Six blockers below must be fixed first; all are small, independent, and listed with the smallest slice after them. Nothing reviewed requires re-architecture.

## Blockers (fix before calling this a self-hosted package)

### B1. Docker-built SPAs call `localhost:3000`, unreachable from LAN tablets

- Sources: `docker-compose.yml:44-48,61-66,79-83,96-100` (build args default `VITE_API_URL` to `http://localhost:3000`), `apps/pos/Dockerfile:12-19`, `apps/kds/Dockerfile:12-19`, `apps/admin/Dockerfile:12-17`, `apps/web/Dockerfile:12-17` (args baked at build time), `apps/pos/nginx.conf`, `apps/kds/nginx.conf`, `apps/admin/nginx.conf`, `apps/web/nginx.conf` (static only, no API proxy).
- Effect: any tablet/TV opening `http://<server-lan-ip>:5172` loads the page, then the app calls `localhost:3000` — itself — and ordering, firing, and pairing silently fail. The operator's only recourse today is rebuilding images with a hardcoded LAN IP, which breaks on DHCP change.
- Note the dev stack already solved this shape: `apps/kds/vite.config.ts:52-57` and `apps/web/vite.config.ts:17-22` proxy `/v1` same-origin in dev. Production nginx has no equivalent.

### B2. Default `.env` CORS allowlist rejects LAN tablet origins

- Sources: `.env.example:80` (`CORS_ORIGINS=` set to a localhost-only list), `apps/server/src/index.ts:64-87` (non-empty allowlist = exact-match only; the LAN-aware localhost + RFC1918 + `*.local` default at lines 72-82 applies **only when the variable is empty**).
- Effect: every installer copies `.env.example` → `.env` (`scripts/install.sh:24-27`, `scripts/install.ps1:21-24`, `scripts/install-windows-turnkey.ps1:109-113`, `scripts/launch-with-update.bat:27-31`, `scripts/quickstart.ts:48-57`), so out-of-box self-host serves pages to LAN devices (`scripts/quickstart.ts:86-89` prints LAN URLs; firewall opened at `scripts/install-windows-turnkey.ps1:136-152`) while the API rejects their browser origins. LAN tablets fail at login/menu fetch with no actionable error.

### B3. No production-mode self-host path — installers end in full dev mode

- Sources: `scripts/install.sh:40`, `scripts/install.ps1:37` (`pnpm start`), `scripts/launch-with-update.bat:34` (`pnpm quickstart`), `scripts/quickstart.ts:134-138` (`spawn(pnpm, ['dev'])` → root `package.json:15` `turbo run dev --concurrency 25`), `docker-compose.yml:18-36` (no `NODE_ENV`), `apps/server/package.json:16` (`start: tsx src/index.ts`), `apps/server/src/lib/secrets.ts:26-50` (fail-closed production gate only engages with `NODE_ENV=production` + real keys).
- Effect: the "installed" restaurant runs ~25 watch-mode dev servers (Vite HMR, tsx watch) with no process supervision, no restart-on-reboot (no systemd unit, no launchd plist, no Windows service — only a login-time shortcut), and compose never sets `NODE_ENV=production`, so the production auth gate in `assertProductionAuthConfiguration()` is unexercised on the exact path restaurants will use. `.env.example:76` ships `CULINARYOS_DEMO_MODE=true`, so compose without hand-editing runs demo posture with the mock store.

### B4. Three conflicting Node.js floors

- Sources: root `package.json:90-93` (`engines: node >= 22`), `apps/server/Dockerfile:1`, `apps/pos/Dockerfile:1`, `apps/kds/Dockerfile:1`, `apps/admin/Dockerfile:1`, `apps/web/Dockerfile:1` (`node:20-*` images), `scripts/install.sh:12-15`, `scripts/install.ps1:9-12` (accept `>= 18.0.0`).
- Effect: Docker ships a runtime below the declared engine floor; installers accept two majors below it. Production Railway runs Node 22 (per shared ledger), so self-host is the odd deployment out and the first place an engine-gated dependency breaks.

### B5. Launcher auto-updates a live restaurant box on every start

- Sources: `scripts/launch-with-update.bat:14-24` (`git pull --rebase origin main`, failures swallowed), referenced as the shortcut target in `scripts/install-windows-turnkey.ps1:158-184`.
- Effect: unpinned, untested `main` lands on a production box at open-of-business with no rollback step and requires git + network to even attempt. One bad `main` (or one offline morning) turns "double-click to open" into an outage or a silently stale version — the operator cannot tell which.

### B6. No `.dockerignore` — build context ships secrets and repo weight to the daemon

- Sources: repo-wide absence (no `.dockerignore` found; only `.gitignore` at root), `docker-compose.yml:22-24,40-42` (build context `.`), `.env.example` → `.env` flow above.
- Effect: `COPY` lines are selective enough that `.env` is **not** baked into images (verified: Dockerfiles copy only manifests, `packages/`, and the app dir), but every `docker compose up --build` still transmits `.env` (real keys after setup), `.git/`, `node_modules/`, and test output to the Docker daemon. Local daemon = slow builds; any remote builder = credential disclosure.

## Risks (ship with documented workarounds, fix next)

- **R1. Zero-config LAN discovery is built but not wired.** `GET /v1/displays/discover` (`apps/server/src/routes/displays.ts:38-84`), `pnpm mdns` (`scripts/mdns-qr-discovery.ts`, `culinaryos.local` + QR pairing), and `culinary display discover` exist, but neither compose nor any installer starts the mDNS advertiser. Tablets must hand-type the LAN IP from the quickstart banner. Smallest fix: document the manual step in `docs/DEPLOYMENT.md`, then spawn the advertiser from quickstart or add an optional compose profile.
- **R2. Plain HTTP on LAN, no domain/TLS story.** No `Caddyfile`/Traefik/cert artifacts; nginx serves HTTP only. No secure-context API use was found in `apps/pos/src`, `apps/kds/src`, `apps/web/src`, `mobile/` (no WebUSB/Bluetooth/serial/camera), so nothing is broken today — but Stripe Terminal browser flows and any future camera/BLE pairing need verification against secure-context requirements before they are promised for LAN tablets.
- **R3. Installer parity gaps.** `scripts/install.sh` has no firewall, service, doctor, or profile support versus `scripts/install-windows-turnkey.ps1`; `scripts/local-supabase.sh` (required by the compose data-plane path, `docker-compose.yml:4-13`) is bash-only with no Windows equivalent, while the turnkey audience is Windows-first.
- **R4. Doc drift in the self-host runbook.** `docs/DEPLOYMENT.md:42` says migrations V1–V14; the repo is past V17 with V20–V21 interagency migrations. Self-host operators following §2 will under-apply the chain.
- **R5. Compose `env_file: .env` loads every variable into the backend container** (`docker-compose.yml:27`), so `docker compose config` / `docker inspect` print all secrets to anyone with Docker access. Standard practice, but a least-privilege `environment:` list is a one-file hardening step.
- **R6. `.gitignore:10-13` covers `.env`, `.env.local`, `*.env.local` but not `.env.production` / `.env.staging` / `*.env` generally.** One operator backup (`cp .env .env.backup`) is committable.
- **R7. Root `Dockerfile.{backend,pos,kds,recipeos}` are deprecated fail-fast stubs** pointing at `apps/*/Dockerfile`. Correct as-is; delete them in a later cleanup so scanners stop flagging duplicate Dockerfiles. Not blocking.

## Explicitly verified good (no action)

- No `service_role` / secret material in any Dockerfile, compose file, nginx conf, or installer — only ports, hosts, and `VITE_*` public values. Compose build args carry the anon key only, by design.
- `.env.example` contains placeholders only; error paths in `apps/server/src/lib/secrets.ts:45-49` promise variable names, never values.
- Server binds `0.0.0.0:3000` (`apps/server/src/index.ts:228`) and all four Vite dev servers bind `0.0.0.0` (`apps/pos/vite.config.ts:50`, `apps/kds/vite.config.ts:50`, `apps/admin/vite.config.ts:15`, `apps/web/vite.config.ts:15`), matching the LAN story.
- Turnkey firewall rule allows Domain + Private only (`scripts/install-windows-turnkey.ps1:147`) — excludes Public/Guest. Correct.
- Compose `depends_on: service_healthy` + backend healthcheck (`docker-compose.yml:32-36,51-53`) and `restart: unless-stopped` are sound.

## Smallest recommended implementation slice

One PR per item, in this order. Total estimated scope: ~8 files touched, no new dependencies, no migrations, no route changes.

1. **B1 — same-origin API in production nginx (4 files).** Add `location /v1/ { proxy_pass http://backend:3000/; }` (+ `/health`) to the four `apps/*/nginx.conf`, drop `VITE_API_URL`/`VITE_POS_URL`/`VITE_KDS_URL` build args from `docker-compose.yml` (keep `VITE_SUPABASE_*`, `VITE_TENANT_ID`), and default the client API base to same-origin (`""`). LAN tablets then work on any DHCP address with zero config, mirroring the existing Vite dev proxy.
2. **B2 — LAN-safe CORS default (1 file).** Set `CORS_ORIGINS=` (empty) in `.env.example` with a comment pointing at the LAN-aware default in `apps/server/src/index.ts:72-82` and noting cloud operators should set an explicit allowlist. Empty is safe for cloud (public page origins still match nothing) and fixes LAN out of box.
3. **B6 + R6 — artifact/secret exclusions (2 files).** Add root `.dockerignore` (`.env*`, `.git/`, `node_modules/`, `dist/`, `*.log`, coverage, `.turbo/`); extend `.gitignore` with `.env.*` (keep negating `.env.example`).
4. **B4 — one Node floor (8 files, one-line each).** Bump the five `apps/*/Dockerfile` base images to `node:22-*` and the three installer checks (`scripts/install.sh`, `scripts/install.ps1`, turnkey winget label) to `>= 22.0.0`, matching `engines` and Railway.
5. **B5 — pinned, opt-in updates (1 file).** Remove the silent `git pull` from `scripts/launch-with-update.bat`; launch the pinned checkout by default and gate updates behind an explicit `--update` flag (later: pin to release tags).
6. **B3 — production compose overlay + preflight (2 files).** Add `docker-compose.prod.yml` (sets `NODE_ENV=production`, keeps `env_file`, no demo defaults) and document the one supported live path in `docs/DEPLOYMENT.md` §3: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` + real Supabase keys + `culinary doctor` green. Full service supervision (systemd/Windows service) stays a follow-up stage.

## Validation commands (run per slice; no secrets, no deploys, no DB writes)

```bash
# 0. Static audits (expect: no matches except docs of variable *names*)
rg -i -n "service_role|SUPABASE_SERVICE_ROLE|STRIPE_SECRET|PRIVATE KEY|BEGIN .* PRIVATE" \
  apps/*/Dockerfile docker-compose.yml docker-compose.prod.yml apps/*/nginx.conf scripts/install.*
test -f .dockerignore && echo DOCKERIGNORE_OK
docker compose config --quiet && echo COMPOSE_OK          # parsing only; run with placeholder .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet && echo PROD_OVERLAY_OK

# 1. B1 same-origin proxy: build one client, confirm no baked localhost API base
docker build -f apps/pos/Dockerfile -t culinaryos-pos:review .
docker run --rm --entrypoint sh culinaryos-pos:review -c \
  "grep -R 'localhost:3000' /usr/share/nginx/html | head -5; test $? -ne 0 && echo NO_BAKED_LOCALHOST"
docker run --rm --entrypoint sh culinaryos-pos:review -c \
  "grep -n 'proxy_pass http://backend:3000' /etc/nginx/conf.d/default.conf"

# 2. B2 CORS default: fresh .env must leave CORS_ORIGINS empty (code default allows LAN)
cp .env.example /tmp/env.review && grep -E "^CORS_ORIGINS=$" /tmp/env.review && echo CORS_DEFAULT_OK
# Live check (needs local API only, no DB): Origin header from a LAN host must echo back
# NODE_ENV=development CULINARYOS_DEMO_MODE=true pnpm --filter @culinaryos/server start &
# curl -s -o /dev/null -w "%{http_code}\n" -H "Origin: http://192.168.1.50:5172" http://127.0.0.1:3000/health

# 3. B6/R6 exclusions: .env must not reach the daemon context listing
docker build --no-cache -f apps/server/Dockerfile --progress=plain . 2>&1 | grep -i "sending build context" 
# (compare context byte size before/after .dockerignore; .env/.git must be excluded)
git check-ignore -q .env.production .env.backup && echo GITIGNORE_OK

# 4. B4 Node floor: one version everywhere
rg -n --no-heading "node:2[0-9]|>= ?1?[0-9]" apps/*/Dockerfile scripts/install.sh scripts/install.ps1 scripts/install-windows-turnkey.ps1 package.json

# 5. B5 launcher: no network mutation on the default path
grep -n "git pull" scripts/launch-with-update.bat; test $? -ne 0 && echo NO_AUTO_PULL

# 6. B3 prod overlay: fail-closed without real keys (expect non-zero exit + variable names, no values)
NODE_ENV=production SUPABASE_URL=https://placeholder.supabase.co SUPABASE_SERVICE_ROLE_KEY=placeholder \
  pnpm --filter @culinaryos/server start; test $? -ne 0 && echo FAIL_CLOSED_OK
```

## Out of scope (not reviewed here)

Codex owns `docs/RELEASE_READINESS.md` and deployment/auth integration review per the 2026-10-31 ledger entry; Railway service state, live auth verification, and the SaaS-beta/marketing deliverables were not assessed. Database contents, live credentials, and production data were not touched.
