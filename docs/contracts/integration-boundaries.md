# Integration contract boundaries

Authoritative business behavior resides in domain services exposed through the API. Web, CLI, SDK and MCP call those services with authenticated actor/tenant context. Typed payload checks are structural validation, not authorization. [Event contracts](../architecture/event-contracts.md) describe eleven versioned payloads and the separate legacy outbox profile.

| Surface | Current source | P05 evidence and remaining gate |
| --- | --- | --- |
| API | apps/server/src/index.ts and routes/ | Existing Hono /v1 route mounts. URL prefix alone does not prove stable request/response compatibility. Route contracts, authenticated acceptance and applied DB behavior must be verified per migration. |
| SDK | packages/sdk/src/index.ts | Client uses API requests and tenant/auth headers; many responses remain any-shaped. No full response-schema/authorization parity claim. |
| MCP API helpers | mcp/src/api-headers.ts | Shared helper supplies tenant/caller/auth headers but defaults tenant and accepts several environment credential sources. Header presence alone does not establish actor authorization. |
| Unified MCP | mcp/src/unified-server.ts | API wrapper separately builds headers, has a service-role credential fallback and default tenant. This differs from shared helper and requires security-reviewed convergence. |
| KDS MCP | mcp/src/kds-server.ts | Ticket APIs coexist with direct Supabase prep/recipe/vendor/inventory operations, including writes. This contradicts target MCP -> API -> domain ownership; no compliance claim. |
| Recipe MCP | mcp/src/recipe-server.ts | Has a RecipeOS external URL fallback; eventual Prep contract migration must inventory consumer/configuration dependence before source retirement. |

Version targets: culinaryos-api-v1, culinaryos-events-v1 and explicit SDK/MCP compatibility records. Breaking changes need version/deprecation/migration notes. Current DomainEvent numeric version is not universally literal-enforced; additive V1 contracts are not yet adopted by the live broker. Nine declaration-only wire specifications remain pending because payload evidence was not found in the bounded literal scan.

Before migrating a tool: map input/output/error schema, authoritative endpoint, actor permissions, tenant binding, side effects, retries/idempotency, audit and negative acceptance cases. Direct MCP database paths must be moved behind owning domain services with feature parity and rollback. Do not solve this by expanding credentials or bypassing RLS. The P05 inventory documents these gaps; no runtime, secrets or permission changes are made here.
