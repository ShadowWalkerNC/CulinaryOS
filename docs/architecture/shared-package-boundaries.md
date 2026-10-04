# Shared package boundaries

P05 defines target boundaries before moving features. [Foundation layout](foundation-layout.json) identifies directories and existing implementations; [culinary-foundation.json](culinary-foundation.json) owns data/event assignments. Descriptor ownership does not grant a package ownership of all referenced application data.

| Existing package family | Responsibility and boundary |
| --- | --- |
| shared, types | Reusable structural/domain types. Event contracts remain in shared/src/types; avoid a second authoritative copy. |
| event-bus | Existing event transport/handlers; consume shared contracts. Transport providers do not own domain truth. |
| auth | Shared authentication mechanisms; authorization stays enforced at authoritative services. No client service-role credentials. |
| db | Persistence/provider access behind services; application clients and MCP adapters must not bypass domain rules. |
| sdk | Typed API client surface; business implementation belongs in services. Existing any-shaped responses require later contract hardening. |
| ui, config | Presentation primitives and configuration. No importing app implementations into shared packages. |
| ratio/prep/food-cost/labor/waste/forecast/accounting/commissary/loyalty engines | Reusable domain calculations; module/domain assignment must be confirmed by feature inventory before migration. Existing names do not prove exclusive data ownership. |
| asset/pdf/seo tools, template-engine | Supporting media/document/site functionality; keep domain mutations behind owning APIs. |

Target packages/contracts and packages/events currently contain boundary metadata referencing shared/types and event-bus. They have no package.json, separate build or copied business logic. No workspace package or SDK is created merely to satisfy a diagram.

Direction: apps -> modules -> domain/contracts -> infrastructure. Cross-module requests use versioned APIs/events; Prep must not import Marketing implementation or access its tables directly. Existing modules directories are metadata-only, so full runtime layering remains NOT RUN. The packages/src-to-app guard is narrower: it checks static imports/exports, import-equals and literal dynamic imports/requires, and rejects unresolved internal references. Passing it proves that bounded rule, not full architecture compliance.

Before P06, inventory each source's packages, imports, data, auth and API/MCP consumers. Choose canonical implementation once, define contract/version/deprecation and rollback, then migrate incrementally. Shared engine reclassification and independent deployment decisions must follow evidence rather than names.
