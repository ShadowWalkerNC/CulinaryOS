# Hardware economics and build-versus-buy
Date: 2026-11-24 | Planning assumptions in USD, not supplier quotes, verified current market prices or certification cost estimates.

| Thermal concept | Prototype | Production/unit at ~1000 | Competitor / indicative historical planning range | Strategy |
|---|---:|---:|---|---|
| Sense | 20–35 | 12–22 | Govee 25–40; SensorPush ~55; Monnit commercial quote | build |
| Probe | 30–55 | 22–38 | ThermoPro 15–30; Thermapen ~109; Testo | integrate |
| Control | 40–75 | 25–45 | Inkbird 30–50; Auber 45–100; Johnson Controls 80–160 | shared low-voltage |
| Room | 50–90 | 35–65 | Nest 100–130; ecobee ~140; INNCOM quote | integrate |
| Multi | 60–110 | 40–70 | Inkbird 35–80; Testo/REED professional | shared expansion |
| Outlet | 35–65 | 25–45 | Inkbird 40–60; BN-LINK 20–35 | buy |
| Cook | 55–100 | 35–65 | Inkbird 50–90; ThermoWorks Signals; FireBoard | shared kit |
| Surface | 30–60 | 22–40 | Etekcity 20–35; Fluke 100–150 | buy |

Consumer prices are not like-for-like with certified commercial equipment. Confirm exact model, listing, probe, gateway, subscriptions, installation, durability and API support before comparison. No current price verification completed in this planning slice.

## Target cost breakdown
Sense basic $13.50: MCU 2, sensor 2.50, PCB 2, batteries 1.50, enclosure 1.50, LED/button .30, assembly 1.50, testing 1.50, packaging .70. Control $35 (board/display, isolated interfaces, enclosure, assembly/test; excludes probes and adapter). Expand $20 (front end, board, connectors, enclosure, assembly/test; excludes probes). These are pre-certification illustrative targets and need recalculation for sanitary production.

| Lifetime units | Sense manufacturing | Allocation of hypothetical $25k compliance | Combined |
|---:|---:|---:|---:|
| 100 | 19 | 250 | 269 |
| 1000 | 13.50 | 25 | 38.50 |
| 5000 | 11 | 5 | 16 |

Example at $39.99 retail and 1000 units: $1.49 remains after $13.50 manufacturing and $25 allocated compliance, before warranty, shipping, development and support. Prior $29.99/$39.99 price targets are not commitments. Compliance budget is hypothetical; obtain lab quotes including surveillance and redesign. Model fixed engineering/tooling/certification, landed unit costs, calibration, warranty, channel fees, returns, support, financing and lifetime units. Break-even = fixed costs / positive per-unit contribution (price minus all variable costs). Compare 3–5 year installed TCO, including labor, software, downtime and replacements.

## Make/buy gate
Build only if shared platform, validated customer need, compliant landed TCO or unique workflow value, plausible demand, margin and service path beat qualified OEM alternatives. Start with mounts, buttons, sensors, timers and expansion; integrate commercial probes, thermostats, mains controls, networking, printing, payments and appliances. Validate competing models and supplier quotations, request sample and lab scope, test at pilot site; record evidence and owner approval before production order.