# Native PostgreSQL bootstrap acceptance

Scope: CULINARYOS-103A. Operator-only preparation of the first restaurant and owner on an empty database. This command is not the installer or public SaaS signup.

1. Provision a dedicated PostgreSQL instance and database. Verify the target and configure private connections. The setup credential must own the migration ledger, be able to create roles, and bypass forced RLS for initial setup. Keep it out of the application environment. Railway preview topology requires a dedicated PostgreSQL service per customer; a login role can have cluster-wide memberships.
2. Point `DATABASE_MIGRATION_URL` at that new database in the setup process. Run `node --import tsx packages/db/src/cli.ts migrate` to see the release migration plan, then `node --import tsx packages/db/src/cli.ts migrate --apply` after confirming the target. Do not apply legacy Supabase migrations to the native database.
3. Supply a private JSON object on stdin. Call `node --import tsx apps/server/src/postgres/bootstrap-cli.ts --apply`; omitting `--apply` prints help without connecting. The input must include these fields:

   | Field | Required value |
   | --- | --- |
   | `database` | Exact name of the dedicated migrated database |
   | `restaurantName`, `slug` | Operator's restaurant name and a lowercase hyphen-separated slug, at most 63 characters |
   | `ownerEmail`, `ownerDisplayName` | First owner's details; local setup does not verify email ownership |
   | `ownerPin` | Random eight-digit PIN delivered privately to the owner |
   | `runtimeRole` | Unique name beginning `culinaryos_runtime_`, with lowercase letters, digits and underscores |
   | `runtimePassword`, `pinLookupSecret` | Independent random secrets; generate 32 random bytes for each and encode as base64url |

   Pipe from a secret manager or a private file accessible only to setup. For example, PowerShell: `Get-Content -Raw -LiteralPath $privateBootstrapPath | node --import tsx apps/server/src/postgres/bootstrap-cli.ts --apply`. Do not pass secrets as CLI flags, commit the input, or put it in a shared folder. Keep database diagnostics private; stored verifiers are sensitive even when they do not contain cleartext credentials.
4. Record the returned tenant ID and use the supplied runtime role/password for `DATABASE_URL`. Inject the same `CULINARYOS_PIN_LOOKUP_SECRET` into the API, without `DATABASE_MIGRATION_URL`. Run `node --import tsx packages/db/src/cli.ts check-role` as runtime. Native mode uses `CULINARYOS_NATIVE_PG=true`. A persistent, private PIN lookup secret is required across restarts.
5. A repeat run on an initialized database refuses rather than replacing the owner or resetting credentials. If a connection is lost around commit, inspect the existing tenant and verify the original credentials privately before any retry. Preserve the original secret material until first login is verified. Owner recovery, PIN rotation and hosted email verification are separate acceptance work.

Verification command: `node --import tsx --test tests/server/native-bootstrap.test.ts`. Real DB checks require `TEST_BOOTSTRAP_DATABASE_URL` for a loopback-only PostgreSQL cluster marked `cluster_name=culinaryos-bootstrap-test`. They create two temporary databases, require SCRAM for runtime logins, and clean up only test-owned resources. Never point this suite at a live or shared development cluster.

Release gates remain: actual production process startup/restart, complete POS/KDS/admin workflow, packaged setup/upgrade/restore, LAN device acceptance and independent managed preview approval. Local PIN login is not a public internet onboarding mechanism.

> 2026-11-11 supersession note (CULINARYOS-104, history above preserved): the
> "actual production process startup/restart" portion of the gate above is
> superseded by the newer 103B evidence — the production HTTP entrypoint was
> started twice with runtime-only credentials, the owner session and saved order
> survived process replacement, and fresh sign-in passed (3/3
> tests/server/native-bootstrap.test.ts; see .ai/HANDOFF.md CULINARYOS-103B and
> docs/HYBRID_RELEASE_PLAN.md Revision 2 execution evidence). The remaining
> workflow, packaging, LAN-device, and managed-preview gates are unchanged.
