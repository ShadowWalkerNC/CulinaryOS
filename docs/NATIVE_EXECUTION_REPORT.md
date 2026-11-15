# CulinaryOS Native execution report

## Decision and current state

Build one Rust product in the CulinaryOS repository. Ship a private site server, dedicated POS and KDS apps, a manager app, an operator CLI and scoped integrations. Provide platform-specific Windows, Linux and Android packages. Qualify a Linux appliance image after the installed product and recovery paths pass. Keep existing code and migration evidence available during the transition.

The current checkout is based on 4ca345f with ongoing local work. The TypeScript reference has previously passed synthetic PostgreSQL startup, restart, order, ticket-list and cash replay tests. This report uses that evidence as a behavior baseline. It does not certify a restaurant installation. The existing Rust hardware daemon is a reuse candidate. The Rust device policy and registry prototype are in packages/native. The prototype has no network transport or operator authentication.

## Product map and risks

| Area | Current evidence | Delivery gap and acceptance |
| --- | --- | --- |
| Site setup | Reference owner bootstrap and restricted database login tested locally | Rust site service, setup wizard, repair and authenticated administrator setup on a clean machine |
| Company and devices | Rust company/site/role gate and registry prototype | Authoritative registry behind the service, manager approval, station existence and entitlement checks, authenticated transport and protected device credential storage |
| POS and kitchen | Reference create/send/list and cash replay passed | Native POS and KDS install and launch, menu and floor plans, permission checks, fire/hold/bump, durable reconnect and drawer close |
| LAN and offline | No native cross-device or outage acceptance | Separate WAN loss, terminal isolation and host loss. Prove ordered replay, revision conflicts, stale screen and no duplicate settlement |
| Hardware | Existing Rust daemon source and earlier design | Model-specific drivers and real printer, drawer and reader results. Evaluate ESP32 for a scoped display or button panel only |
| Commercial packages | Proposed role and entitlement model | Signed package manifest, installer, commercial entitlement policy and predictable expiration, offline grace, upgrade and uninstall |
| Hosted and public | Railway and storefront are planned delivery paths | Two synthetic customers with separate database credentials, dedicated public storefront, scoped outbound sync and tested restore |
| Updates and support | Proposed management service | Signed artifacts, staged rollout, owner-approved scoped support, redacted diagnostics, recovery after interrupted update |
| Appliance | Bootable server and KDS images planned | First boot, role enrollment, power loss, fallback image, persistent data, spare-device restoration and actual model certification |

The largest operational risks are stale or duplicated restaurant state after reconnect, one device gaining another role, payment totals drifting across retries or migration, and updates leaving an appliance unable to boot or restore. Each is a release gate with a repeatable failure test. Desktop performance is a separate measured gate.

## Enrollment design and current implementation

The Rust prototype stores only SHA-256 digests of random 256-bit pairing values and device credentials. Pairing expires after five minutes. Redeeming a code commits both consumption and a server-assigned device record in one replacement of the registry file. A registry lock serializes owners. Reopening the registry retains enrollment and revocation. A trusted caller supplies server time and checks operator privileges for issue and revoke. The device cannot pick its own role through redemption.

The prototype uses an atomic file replacement in a site-owned directory. It does not provide database transaction integration, device TLS, production filesystem or power-loss certification, live manager authorization, rate limiting, or backup rollback protection. The production design should bind enrollment to the location's durable database and authoritative staff, stations and entitlements. Decide the production adapter during the site service slice. Treat files from the prototype as disposable fixtures.

Use authenticated and encrypted transport for pairing and operations. Define a verification path for the server's identity and an operator approval flow. Keep codes and credentials out of command arguments, logs and public diagnostics. Track issuer, site, role, station, expiry, consumption, and revocation. Define recovery if redemption commits but the device never receives its credential. The initial operator flow can revoke the orphaned assignment and issue a fresh code. A later protocol can add retry-safe credential delivery. A backup restore must preserve or reapply revocation and invalidate stale pairing grants before reopening the LAN listener.

## Execution packet

| Order | Work and ownership | Required evidence |
| --- | --- | --- |
| 1 | Rust site service, protocol, production registry adapter, device and operator authentication | One synthetic site persists across restart. Expiry, replay, concurrency, revocation, wrong site and station, unauthenticated requests, and restore of older state are exercised |
| 2 | Native POS and KDS client spike, package manifests and platform selection | Clean install on a representative terminal, enroll both roles, create an order, display and bump its ticket, close cash and compare latency with the reference |
| 3 | Durability, peripheral integrations and multi-terminal pilot | Ten POS terminals, three managers and multiple KDS stations. Break WAN, LAN and site service independently. Verify replay, drawers, receipt jobs, cash variance and replacement |
| 4 | Signed commercial installers, entitlement and operator tools | Windows, Linux and Android acceptance by device role. Install, upgrade, downgrade/recovery, expired grant and uninstall. CLI and MCP obey API permissions |
| 5 | Hosted control plane, storefront, payments, updates and support | Isolated Railway preview tenants, online order delivery and retry, signed provider receipts, isolated support sessions and failed update recovery |
| 6 | Appliance images and migration | Bootable site-server and dedicated KDS images, power loss, upgrade/restore to spare, inventory and payment reconciliation, then controlled pilot |

Each implementation unit should state its owned files, contract change, migration or rollback path, and exact verification command. Keep implementation workers on isolated branches for concurrent writing. Review generated changes against the active checkout before integration. Use synthetic records until operator or provider acceptance requires an explicitly approved environment.

## Decisions that can wait for evidence

Start the Rust service and protocol with an existing PostgreSQL compatibility target. Choose the desktop UI framework after a representative screen and installer run. Set performance budgets from the lowest-spec pilot terminal and a measured baseline. Confirm tier pricing and device limits before commercial packaging. Choose final reader models and certify with the provider before enabling card acceptance. Decide appliance hardware after comparing deployment, thermal and recovery behavior. None of these choices prevents building the synthetic site service and enrollment contract now.

Reference architecture and public competitor sources are in [Native platform plan](NATIVE_PLATFORM_PLAN.md). Previous release tests and outstanding gates are in [Hybrid release plan](HYBRID_RELEASE_PLAN.md).


## Verified on this checkout

- Windows: five Rust tests passed, including one-time redemption, expiry, role enforcement, second-owner refusal, registry reopen and revocation. Filesystem crash and appliance power-loss behavior remain unverified.
- /team recovered the CulinaryOS checkpoint. The read-only review task CULINARYOS-9554 exited with code 1. Independent review findings are pending.

## Copy-ready first implementation assignment

Build stage 1 of this report in the CulinaryOS repository. Use packages/native as the policy baseline and docs/NATIVE_PLATFORM_PLAN.md for the product scope. Preserve the dirty checkout and use synthetic data. Deliver one private Rust site service that loads a verified device assignment from durable storage and authorizes calls by company, site, device role and station. Add operator-gated issue and revoke, one-time pairing over authenticated transport, and a recovery path for lost responses and stale backups. Verify restart, concurrent redemption, wrong-site access, rejected roles, expiry and revocation through the service entry point. Document the exact checks and their limits. Keep installers, live devices, paid providers and production deployment for their acceptance stages.


## Stage 1 service checkpoint

The [Rust site service runbook](acceptance/RUST_SITE_SERVICE.md) records the Windows HTTPS binary, PostgreSQL migration 009, restore fencing and local verification. Setup still uses the reference bootstrap. Remaining work starts with packaged setup and the native POS-to-KDS and cash workflow.
