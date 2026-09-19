# CulinaryOS — Hardware Bill of Materials (BOM) & Certified Kit v1

> **Status:** Production Standard — Stage 7 Certified  
> **Philosophy:** Open, commercial-off-the-shelf POS hardware. Zero proprietary hardware lock-in.

---

## 1. The Blessed Kit v1 (Turnkey Station Target)

Unlike legacy incumbent systems (such as Toast) which lock operators into \$800–\$1,200 proprietary terminals and forced processing contracts, CulinaryOS is built to run on universal web standards and certified, industry-standard peripherals:

| Role | Certified Model | Protocol / Interface | Est. Retail Cost | Toast Incumbent Benchmark |
| :--- | :--- | :--- | :--- | :--- |
| **Receipt Printer (FOH)** | Star TSP143IV / Epson TM-m30 | ESC/POS over LAN, USB-C, CloudPRNT | \$289 – \$310 | \$399 (Proprietary locked) |
| **Kitchen Printer (BOH)** | Star SP742 / Epson TM-U220 | Impact Dot-Matrix with ribbon, LAN (Heat/grease-proof) | \$235 – \$320 | \$380 (Proprietary locked) |
| **Cash Drawer** | APG Vasario 1616 / CD4-1616 | 24V RJ12 Printer-Driven DK Port | \$95 – \$125 | \$170 |
| **Card Reader (Card-Present)** | Stripe WisePOS E / S700 | Stripe Terminal SDK (EMV, NFC, Apple/Google Pay) | \$249 – \$349 | \$799 – \$999 (Locked terminal) |
| **Terminal Tablet** | iPad 10.2 / Galaxy Tab A9+ | Universal PWA / React Chrome Browser | \$249 – \$329 | \$450 (Locked Android) |

**Total Hardware Cost:** **~\$884 total** per primary countertop station (vs. **\$1,800 – \$2,200+** for Toast).

---

## 2. Cash Drawer Wiring & Voltage Protection

> [!CAUTION]
> **Cabling Warning:** Standard 4-pin RJ11 telephone cables are **NOT** wired the same as POS 6-pin RJ12 cash drawer kick cables.
> 
> * Cash drawers plug directly into the **DK (Drawer Kick) port** of the thermal receipt printer (e.g. Star TSP143IV or Epson TM-m30), **not** the tablet.
> * Always use genuine POS-rated RJ12 cables matching the printer's solenoid voltage (typically 24V, 1A max).
> * Using a standard phone cable can short the solenoid coil or damage the printer logic board.

---

## 3. ESC/POS Commands & Verification

CulinaryOS sends direct binary ESC/POS streams via raw TCP sockets (port 9100) or browser WebUSB/WebSerial.

### Standard Drawer Kick Command
```
ESC p m t1 t2
Hex: 1B 70 00 19 FA
- 00: Pin 2 (Standard drawer 1)
- 19: 50ms ON pulse
- FA: 500ms OFF pulse
```

### CLI Verification Tools
Operators and deployment technicians can test physical hardware directly from the terminal:

```powershell
# 1. Display Hardware Matrix and BOM comparison
culinary hardware bom

# 2. Print diagnostic test receipt with font styling, barcodes & auto-cut
culinary hardware test-receipt --ip 192.168.1.150 --port 9100

# 3. Trigger raw cash drawer kick pulse
culinary hardware kick-drawer --ip 192.168.1.150 --pin 2
```
