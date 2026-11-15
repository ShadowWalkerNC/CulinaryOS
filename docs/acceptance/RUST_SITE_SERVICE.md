# Rust Windows site service acceptance

This is the first service slice from the native rebuild plan. It serves HTTPS with an operator-supplied certificate, connects to a PostgreSQL instance on loopback, and refuses a privileged runtime database login. The site UUID is the existing tenant UUID. Multi-location company administration is subsequent work.

## Setup and entry point

1. Apply the native PostgreSQL migration chain, including 009, with the migration owner. Use the existing owner bootstrap command to create the tenant, staff PIN and restricted runtime login. The bootstrap command still uses the existing Node tooling. See [Native bootstrap](NATIVE_BOOTSTRAP.md).
2. Build with `cargo build --locked --manifest-path packages/native/Cargo.toml --bin culinaryos-site`.
3. Launch `culinaryos-site.exe` with the restricted `DATABASE_URL`, `CULINARYOS_SITE_ID`, `CULINARYOS_PIN_LOOKUP_SECRET`, `CULINARYOS_SITE_TLS_CERT`, `CULINARYOS_SITE_TLS_KEY`, and `CULINARYOS_SITE_ORIGIN`. The bind address defaults to loopback. For a LAN trial use `CULINARYOS_SITE_BIND` and a certificate valid for the origin. Store private keys and configuration under the service account's restricted storage. Keep migration credentials in the setup process.
4. Check `GET /ready` using a trusted certificate. Use `POST /v1/auth/pin-login` to authenticate the owner. Issue a grant with `POST /v1/sites/{site}/pairings` using the owner or manager session and the device's label, role and optional KDS station.
5. Redeem the grant once at `POST /v1/sites/{site}/pairings/redeem`. A device must verify the server certificate against the trusted setup information before transmitting the code. Device apps and OS-backed credential storage remain future work. Use the KDS credential at `GET /v1/kds/tickets`. The site returns the assigned station's active tickets. A manager revokes with `DELETE /v1/sites/{site}/devices/{device}`.

The five-minute pairing grant is consumed and the device row is created in one database transaction. Secrets are returned only in the issuing response and stored as digests. A lost redemption response requires the manager to revoke that assignment before issuing another grant. PIN authentication has a shared in-process attempt budget for this private pilot. Multi-instance throttling and per-device telemetry remain open.

## Restore drill

Keep the restored site offline. Reconcile staff and manager access against current records, including staff removed after the backup. Using the migration owner against the isolated restored database, bind the verified site UUID as parameter 1 of `packages/native/sql/fence-restored-site.sql`. The statement deletes pending grants and revokes device credentials and staff sessions. Then restart the site, sign in again with current owner credentials, and re-enroll approved devices. Reconcile orders and money separately before reopening service.

## Automated acceptance

`node --import tsx --test tests/server/rust-site-enrollment.test.ts` runs against a disposable loopback PostgreSQL cluster marked `culinaryos-bootstrap-test`. Set `TEST_BOOTSTRAP_DATABASE_URL`, `TEST_RUST_SITE_EXE`, `TEST_RUST_TLS_CERT` and `TEST_RUST_TLS_KEY`. The test trusts the fixture certificate explicitly and owns only its generated database and runtime role. Without those settings, the integration test skips.

The service slice covers site readiness, owner PIN compatibility, enrollment, revocation, and KDS reads. Native POS/KDS apps, kitchen actions, order writes, checkout, commercial packaging, cloud and appliance acceptance are subsequent stages.


## Windows evidence

The Windows executable built successfully. Five Rust unit tests passed. The dedicated HTTPS/PostgreSQL 18 acceptance test passed on rerun after the first run timed out at five seconds. It verified real owner PIN login, inaccessible pairing records under the runtime role, one concurrent redemption winner, expiry, wrong-site and wrong-station rejection, tenant-scoped ticket rows, persistence and revocation across process restart, and invalidation of restored grants, device credentials and sessions. The existing native bootstrap and order suite passed 3/3 with migration 009 applied. This was a loopback fixture and does not establish a performance budget.
