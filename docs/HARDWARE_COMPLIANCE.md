# Hardware compliance and commercial release policy
Date: 2026-11-24 | Owner requirement: all devices must conform to applicable rules and NSF sanitation requirements. US-first planning, not legal advice or a certification determination.

## Applicability matrix (candidate standards, confirm with lab and authority)
| Product/environment | Evaluate |
|---|---|
| Food temperature instruments, kitchen mounts, timers and accessories | NSF/ANSI 2, NSF/ANSI 51 as applicable; FDA Food Code and adopted local rules |
| Heating/cooling equipment controls | NSF/ANSI 4 or 7 if in scope; UL/CSA 60730 series or applicable control standard; OEM compatibility |
| Measurement equipment | UL/CSA 61010-1 and relevant particular standards |
| IT terminals, displays, gateway, servers | UL/CSA 62368-1 where applicable; FCC Part 15; mounting/accessibility |
| Room thermostats | automatic control safety, NEC/local electrical code, HVAC ratings; FCC where applicable |
| Wireless/battery devices | FCC equipment authorization; battery safety and UN 38.3 transport as applicable |
| Scales | applicable legal-for-trade approval and state weights/measures rules |
| Guest kiosks and software | accessibility and privacy; evaluate ADA and relevant WCAG criteria |
| Payments | certified provider hardware and applicable PCI DSS scope; never store PAN/CVV |
| Healthcare nonclinical | facility infection-control and procurement rules; HIPAA where applicable; no clinical intended use |
| Building systems | approved OEM interfaces; qualified installation; independent life safety remains intact |

NSF certification is required under COS policy where an applicable sanitation certification pathway exists; document scope with lab/AHJ. NSF/ANSI 51 material evidence does not certify the assembled device. OSHA NRTL approval where required, FCC obligations and sanitation are separate. Precertified modules/power supplies do not confer finished-product certification. Confirm edition and jurisdiction before design freeze. No universal claim that all devices require identical marks.

## Design and test requirements
Smooth nonabsorbent cleanable surfaces; minimize dirt traps, exposed fasteners and seams in splash/food zones; validate chemical resistance, food-contact grades and supplier traceability, mechanical stability, moisture/condensation, thermal performance and ingress per IEC 60529 when claimed. IP65 kitchen/IP67 probe are targets, not evidence. Do not assume 3D printed prototypes are sanitary production parts. Food Code temperature instruments generally require ±1°C food and ±1.5°C ambient/water for Celsius/dual-scale instruments; confirm adopted text and exceptions. Target ±0.5°C complete-system accuracy over defined food/refrigeration range; calibration serial/date/traceability, uncertainty, drift and recalibration plan. Air readings are not internal food readings.

## Release checklist (blocking)
1. Intended use, installation zone, market and hazards documented.
2. Lab/AHJ applicability determination, standards editions and design review.
3. Controlled BOM, approved suppliers, firmware/config revisions, risk and failure analysis.
4. Mechanical, electrical, EMC/radio, sanitation, calibration and environmental tests as applicable.
5. Verified certificates/listings/declarations for exact model and configuration; installation and cleaning instructions.
6. Production quality, lot/serial traceability, end-of-line tests, field support and recall plan.
7. Review changes against certification scope and maintain surveillance/renewals.
8. Public claims and open-source DIY instructions accurately distinguish commercial certified configuration from user builds.

No purchase, manufacture-for-sale or commercial deployment of unapproved COS prototypes. Third-party model certification and integration compatibility verified separately; avoid modifications that invalidate listings.

Official starting points (verify current editions and scope): https://www.nsf.org/ ; https://info.nsf.org/Certified/Food/ ; https://www.fda.gov/food/retail-food-protection/fda-food-code ; https://www.osha.gov/nationally-recognized-testing-laboratory-program ; https://www.fcc.gov/oet/ea ; https://www.ada.gov/ . Laboratory quotes and jurisdiction review pending.