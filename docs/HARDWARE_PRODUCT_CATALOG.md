# COS hardware product catalog
Date: 2026-11-24 | All names, targets and interfaces proposed; no manufactured or certified COS product claimed.

## Shared platforms
| Family | Target architecture | Strategy |
|---|---|---|
| Sense / Button | low-power ESP32-C3-class module, BLE, replaceable batteries, optional wired power | shared PCB where feasible |
| Control | ESP32-S3-class, 8 MB flash, 2.4–3.5 inch LCD, physical encoder, 12–24 V DC, isolated low-voltage outputs | shared controller |
| Expand | 4-channel sensor-specific front end, wired RS-485 option, no independent display | modular |
| Tag | low-power e-paper, BLE/gateway | OEM assembly |
| Terminal / Display | commercial ARM/x86 tablet or media player, Ethernet/Wi-Fi | assemble or integrate |
| Core / Gateway | existing edge reference appliance, commercial compute and networking | integrate/assemble |
| Mount | cleanable stands, docks, frames and printer housing | design/build after mechanical and sanitation review |

Applications include timers, service calls, status lights, digital room/table signs, inventory labels, leak/door/occupancy sensors, staff terminals, kiosks and carts. Never make printers, payment readers, routers, locks or commercial appliances simply to expand catalog.

## Thermal variants
| Concept ID | Target specification | Decision |
|---|---|---|
| CT-100 Sense | ambient ±0.5°C validated range; optional replaceable PT1000 probe −40 to 125°C target; BLE; AA; no screen default; IP65 target | build |
| CT-200 Probe | food-contact penetration, ±0.5°C validated food range, 2–4 s target; BLE; IP67 | integrate certified first |
| CT-300 Control | 2–4 inputs, heating/cooling modes, hysteresis/PID; isolated low-voltage commands; local fallback | build shared |
| CT-400 Room | ambient/humidity, ±0.3°C target, guest setpoint, approved HVAC interface | integrate thermostat; optional COS UI later |
| CT-500 Multi | 4 channels, optional 8, RTD/NTC/thermocouple front ends, local logging | Expand module |
| CT-600 Outlet | mains and compressor ratings require specific certification | buy only |
| CT-700 Cook | recipe stages, timer, high-temp probes up to 500°C if validated | Control + Expand kit |
| CT-800 Surface | IR screening, adjustable emissivity, target ±2°C or 2% | buy only |

No universal probe electrical pinout: keyed connectors and identified probe type. Sensor accuracy is complete-system accuracy including drift, placement and calibration. IP, battery life and dimensions are targets, not claims. Enclosure design must allow sanitation, condensation management and serviceability. No direct mains switching or replacement of OEM safety cutoffs in first release.

## Device software contract (proposed)
Per-device identity, tenant/property binding, scoped commands, signed firmware, secure enrollment/revocation, versioned schema, timestamps and sequence numbers, offline buffering with bounded retention, explicit stale/missing/calibration states, local alarms, configurable thresholds, auditable corrective actions. Control requires equipment-specific safe state, limits, watchdog, manual override, compressor protection where applicable, power-loss behavior and independent safety mechanisms. Reject unauthorized or stale commands; no remote unsafe setpoint overrides. Verify on actual hardware before support status changes.

## Evidence states
Candidate -> bench tested -> integration tested -> field validated -> supported configuration. Regulatory evidence is an independent axis: unknown / not applicable with rationale / verified listing or declaration. Neither software tests nor certified components establish finished-device certification.
See [compliance](HARDWARE_COMPLIANCE.md) and [economics](HARDWARE_ECONOMICS.md).