# CulinaryOS product status

Status baseline: November 24, 2026. Status applies to a specific workflow and environment. A passing local test does not establish production availability.

| Status | Scope | Evidence or next gate |
|---|---|---|
| Public | Source code and development documentation | The [repository](https://github.com/ShadowWalkerNC/CulinaryOS) and its [MIT license](../LICENSE) are public. |
| Live production | Commercial product availability is unconfirmed | Confirm the release or deployed endpoint, customer access, supported configuration and smoke-test result before advertising a live product. |
| Tested locally | Native server order entry, kitchen tickets and station completion, cash settlement and drawer close | [November 22 stress run](MUSE_STRESS_TEST_RESULTS.md) records 36 passing HTTP checks with synthetic data on the embedded SQLite runtime. It covers the API workflow. |
| Tested locally | Reference PostgreSQL bootstrap, process restart and persistence | [Release records](AI_SHARED_LEDGER.md) record disposable PostgreSQL results. [Native service runbook](acceptance/RUST_SITE_SERVICE.md) records separate HTTPS and enrollment evidence. |
| In progress | Restaurant and food-truck pilot, native client packaging, self-host installation, LAN recovery and exact-model hardware support | [Hybrid release plan](HYBRID_RELEASE_PLAN.md) and [native platform plan](NATIVE_PLATFORM_PLAN.md). Physical devices and clean installs require acceptance. |
| In progress | Inventory, prep, employee workflows and job board, digital menus, storefront and online ordering | Source and prototypes exist. Track each workflow's customer availability through the release gates. |
| In progress | Hosted service, customer onboarding and card-present payments | Complete hosted tenant provisioning, recovery and supported processor/device acceptance. See the [release control record](RELEASE_READINESS.md). |
| Planned | Hotel and resort operations, institutional dining, hospital foodservice and nursing-home dining | [Hospitality blueprint](HOSPITALITY_BLUEPRINT.md). Healthcare scope starts with nonclinical operations. |
| Planned | COS equipment sales, licensed hardware design releases, installation services and technical support plans | Exact configurations, licensing, cost, service terms and applicable compliance evidence must be recorded before commercial release. |

Record the date, commit or release, environment, result and limits when a status changes. For hardware, record model and configuration, integration compatibility and applicable regulatory evidence independently. Update public copy with the same evidence.
