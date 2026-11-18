# DECISIONS.md — CulinaryOS

Architectural rationale currently lives in [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/ARCHITECTURE_DOSSIER.md](docs/ARCHITECTURE_DOSSIER.md); no standalone decision log exists. Record new Architecture Decision Records here.

- D-001 (2026-10-25 — ADR-0010): Decommission standalone RecipeOS Jetpack Compose Android native app (`Room v4` destructive migration hazard) in favor of multi-tenant Expo Mobile (`mobile/`) and Web surfaces. See [docs/surface-disposition.md](docs/surface-disposition.md).
- D-002 (2026-10-25 — ADR-0011): Unify mobile barcode/SKU inventory receiving and cloud OCR onto Google Gemini 2.0 Flash (`@google/genai`) with structured JSON output and multi-tenant audit logging. See [docs/surface-disposition.md](docs/surface-disposition.md).
- D-003 (2026-10-28 — CleanMyTV & Android TV Kiosk Architecture): Standardize `$19.88` Walmart `onn. 4K` Android TV provisioning on CleanMyTV Launcher Engine v1 (`com.cleanmytv.launcher.culinaryos` + `GET /v1/displays/launcher-config`) paired with `com.culinaryos.display` (`apps/android-tv`) and de-conflicted Display Web App port `:5181`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/APP_SURFACE_OWNERSHIP.md](docs/APP_SURFACE_OWNERSHIP.md).
- Convention: append `D-NNN` entries; link related code/docs.
