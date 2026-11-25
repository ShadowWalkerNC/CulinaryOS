# CulinaryOS

CulinaryOS (COS) is a company building an open-source technology platform to make hospitality and foodservice easier to run and more affordable. We develop software and equipment for taking orders, coordinating kitchens, tracking inventory, organizing employees and displaying digital menus.

We are starting with restaurants and food trucks. The same platform is intended to grow into hotels and resorts, institutional dining, hospital foodservice and nursing-home dining. The healthcare scope is nonclinical.

## How it works

- **Run it yourself.** The core software is published under the [MIT License](LICENSE). Use it, study it, modify it or run it on your own infrastructure.
- **Choose your equipment.** Our model supports using compatible equipment you already own, buying supported COS equipment when offered, or building from published open-source hardware designs. Hardware design licensing and production readiness are tracked per design.
- **Pay for optional help.** Our business model includes affordable hosted services, equipment, setup and technical support. The goal is one connected system without mandatory long-term contracts or proprietary equipment lock-in. Commercial availability and pricing depend on release readiness.

## What you can use today

The public repository contains the source and development documentation. Local native server tests have exercised order entry, kitchen ticket routing and completion, cash settlement and drawer close. The restaurant and food-truck pilot, supported installations, hosted onboarding and commercial hardware are still in development. See the [product status and test evidence](docs/PRODUCT_STATUS.md) for the current boundaries.

## Work on the project

| Start here | What it covers |
|---|---|
| [Development](DEVELOPMENT.md) | Workspace setup and local development |
| [Architecture](ARCHITECTURE.md) | Platform boundaries and runtime context |
| [Roadmap](ROADMAP.md) | Active work and future development |
| [Release plan](docs/HYBRID_RELEASE_PLAN.md) | Self-hosted and hosted acceptance gates |
| [Hardware](HARDWARE.md) | Peripheral integration and hardware evidence |
| [Hospitality blueprint](docs/HOSPITALITY_BLUEPRINT.md) | Future verticals, shared capabilities and expansion gates |
| [Contributing](CONTRIBUTING.md) | Contribution workflow |
| [Security](SECURITY.md) | Security policy and reporting |

The company website lives in `apps/marketing`. The guest storefront lives in `apps/web` and serves restaurant menus, tableside ordering and order status.

[Report an issue or share feedback](https://github.com/ShadowWalkerNC/CulinaryOS/issues)
