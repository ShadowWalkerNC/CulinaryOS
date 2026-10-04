# CulinaryOS architecture
The current TypeScript monorepo and contracts are described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Current resilience changes and PostgreSQL transition design are in [docs/ARCHITECTURE_RESILIENCE_PLAN.md](docs/ARCHITECTURE_RESILIENCE_PLAN.md) and [docs/POSTGRES_TRANSITION_DESIGN.md](docs/POSTGRES_TRANSITION_DESIGN.md). The portfolio's Core/Prep/Ops/Marketing/Web/Intelligence boundaries are targets; existing apps must be mapped before consolidation.

## Governance checkpoint
Updated: 2026-10-04. Portfolio phase P05; product milestones remain separate. [forge.project.json](forge.project.json) describes identity and source/configuration observations, not tested compatibility. [PORTFOLIO_HANDOFF.md](PORTFOLIO_HANDOFF.md) records scope and verification. P02 documentation rollout evidence is historical. Current P05 contract tests/typechecks are described below; no live application or production acceptance claimed.

P05 foundation map: [data ownership/event homes](docs/architecture/culinary-foundation.md), [additive versioned payload contracts](docs/architecture/event-contracts.md). Existing monorepo/DomainEvent/wire names remain; shared type barrel exports eleven strict V1 payload contracts. New validator is not wired into broker/routes and does not authenticate or enforce domain business rules. Nine declaration-only payload specifications remain pending; the held outbox has a separate tested legacy transport profile.


P05 target layout and shared boundaries: [layout](docs/architecture/foundation-layout.md), [package boundaries](docs/architecture/shared-package-boundaries.md), [API/MCP gaps](docs/contracts/integration-boundaries.md), [test strategy](docs/testing/strategy.md). Metadata preparation preserves existing implementations; no live consolidation claimed.

