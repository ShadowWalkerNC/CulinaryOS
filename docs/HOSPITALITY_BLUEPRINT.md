# CulinaryOS hospitality blueprint V2
Date: 2026-11-24 | Status: proposed expansion; owner requirements recorded; no production acceptance implied.

## Product charter
CulinaryOS is an open-source hospitality operating ecosystem: shared business software, connected devices, local continuity and third-party integrations. Restaurants and food trucks remain the initial product and pilot. Hotels, resorts, institutional dining and nonclinical hospital/senior-living operations are future verticals. Publish software, firmware, schematics, BOMs, CAD, protocols and repair instructions; licensing and third-party redistribution rights require review. Commercial certified builds are distinct from DIY builds. No device may be sold for an intended use without applicable compliance evidence. Build only where there is demonstrable operational or total-cost benefit.

## Solution packages (proposed order)
| Package | Software | Hardware / sourcing |
|---|---|---|
| P1 Property infrastructure | device enrollment, local sync, permissions, diagnostics | Core, Gateway; commercial router, AP, UPS |
| P1 Food & beverage | POS, KDS, prep, recipes, food safety, room-service orders | timers, Sense, Control, mounts; third-party payment, printers, probes |
| P1 Housekeeping/laundry | assignments, inspections, room status, linen, lost property | Button, Tag, cart mounts, existing handhelds/laundry |
| P1 Facilities | asset registry, work orders, preventive maintenance, alerts | leak/contact/thermal sensors; approved meters and BMS |
| P2 Guest room essentials | service requests, DND, directory, multilingual QR portal | Button, Control, Tag, existing tablets |
| P2 Front desk | arrivals/departures, room status, shift handover | Terminal, kiosk mounts; existing PMS/key encoders/payment |
| P2 Concierge | requests, messaging, amenities, luggage | Terminal, displays, service buttons |
| P2 Inventory | receiving, stock, purchase orders, transfers | Tag, mounts, certified scales/scanners |
| P3 Smart room | comfort settings, vacancy profiles, energy monitoring | room interface, non-camera occupancy sensors, approved HVAC |
| P3 Signage | scheduling, menus, wayfinding | Tag, Display, Mount |
| P3 Events | banquet orders, venue scheduling, catering | signs, buttons, displays |
| P3 Employee ops | tasks, shifts, training, timekeeping | existing terminals, docks |
| P4 Amenities | reservations, maintenance | existing pool/spa equipment, displays |
| Partner | access/security | approved locks, life safety systems; read-only integration where suitable |
| Future | native PMS, bookings, folios, OTA distribution, revenue management | existing reception equipment |

## Architecture boundaries
Preserve current job-specific UI, tenant isolation, integer cents, provider payment integrity, CLI/SDK parity and offline single-writer ownership. Do not fork the platform per vertical. Model organization/property/department/room/asset as proposed concepts, not schema changes. Existing PMS remains authoritative for stays, occupancy and folios; COS owns its work orders, task state and telemetry. Room charges use idempotent provider-confirmed posting and reconciliation; no raw card data. Guest access is room/stay scoped, expires at checkout, and cannot expose staff data. Do not infer occupancy from cameras or microphones. Local controls must remain usable when cloud or gateway fails; independent protections remain independent. Use documented vendor APIs and evaluate MQTT, BLE, Ethernet, BACnet/Modbus and HTNG specifications without assuming compatibility. No clinical monitoring, medical devices, fire control, door-lock control or safety-critical automation in initial scope.

## Future backlog and gates
| Slice | Exit evidence | Estimate (agent tokens, rough) |
|---|---|---|
| H-A discovery | operator interviews, workflows, current native/legacy runtime map, PMS API sandbox | 10–20k |
| H-B device registry and Sense proof | tenant-bound enrollment, stale reading handling, local logging, calibration and physical test plan | 20–40k |
| H-C tasks and property pilot | housekeeping/work-order lifecycle, offline conflict tests, role isolation, pilot acceptance | 30–50k |
| H-D room services | stay-scoped portal, DND/privacy, accessibility, PMS reconciliation | 20–40k |
| H-E control/energy | approved HVAC interface, equipment-specific failure and safety tests, commissioning | 30–50k |
| H-F advanced PMS | separate business case and legal/payment/integration review | discovery only |

Each implementation slice requires its own reviewed PR, exact file scope, test plan and rollback (disable feature, revert code; migrations need explicit recovery plan). Existing restaurant stabilization and pilot gates take precedence. No procurement or deployment authorized by this blueprint.

See [catalog](HARDWARE_PRODUCT_CATALOG.md), [compliance](HARDWARE_COMPLIANCE.md), [economics](HARDWARE_ECONOMICS.md), [existing integration plan](HARDWARE_SOFTWARE_INTEGRATION_PLAN.md).