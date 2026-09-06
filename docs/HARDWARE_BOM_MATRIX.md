# CulinaryOS — Hardware Bill of Materials (BOM) & Device Matrix (v1.0)

> **Standard:** Stage 7 Hardware Certification  
> **Status:** Production Reference Architecture  
> **Target:** Blessed Kit v1 ($440 Total Hardware vs Toast $799–$999/terminal)

---

## 1. Executive Summary & Competitive Positioning

Incumbent restaurant POS providers (e.g. Toast, TouchBistro) rely on proprietary hardware locks and high upfront terminal markups:
- **Toast Incumbent Math:** ~$799 to $999 per primary terminal upfront, mandatory proprietary locked Android tablets, plus ~$69/month per terminal SaaS fee and closed processing rates (2.49%–2.99% + $0.15).
- **CulinaryOS Positioning:** Standard commercial open hardware speaking universal ESC/POS over LAN/Wi-Fi/USB-C. Restaurants own their hardware with zero vendor lock-in, utilize Bring-Your-Own-Stripe (Connect Standard, merchant KYC/AML handled by Stripe), and pay a flat per-location software subscription.

---

## 2. Blessed Kit v1 (Certified Production Stack)

| Role | Certified Device Class | Recommended Model | Approx. Cost | Communication Protocols |
|---|---|---|---|---|
| **FOH Receipt Printer** | 80mm Thermal Receipt Printer | **Star Micronics TSP143IV** (or Epson TM-m30) | $289 – $310 | ESC/POS, StarPRNT, LAN, WLAN, USB-C, CloudPRNT |
| **BOH Kitchen Printer** | 3" Impact Dot-Matrix Kitchen Printer | **Star Micronics SP742** (or Epson TM-U220B) | $235 – $320 | Impact Ribbon (Red/Black), ESC/POS Emulation, Ethernet (LAN) |
| **Cash Drawer** | Printer-Driven Heavy Duty Drawer | **APG Vasario 1616** / Star CD4-1616 | $95 – $125 | RJ12 DK Port (24V solenoid triggered via printer) |
| **Payment Terminal** | Card-Present EMV / NFC Reader | **Stripe WisePOS E** (or Stripe S700 Handheld) | $249 – $349 | Stripe Terminal SDK, Wi-Fi / Ethernet Dock, Offline Mode |
| **Terminal Tablet** | Commercial Touchscreen Tablet | **10.2" iPad (9th/10th Gen)** or Galaxy Tab A9+ | $249 – $329 | Web POS (Chrome / Safari / PWA), VESA Counter Stand |

**Total Blessed Kit Hardware Cost:** **$878 – $1,093 complete FOH + BOH station**  
*(Single FOH countertop station = Tablet $250 + Thermal Printer $290 + Cash Drawer $95 + WisePOS E $249 = **$884 total** with dual printers, or **$634** without kitchen impact printer).*

---

## 3. Component Deep Dive & Electrical Specifications

### 3.1 FOH Receipt Printer (Thermal)
- **Why Thermal:** Silent operation, ultra-fast throughput (250mm/sec), zero ink or ribbon consumable costs.
- **Certified Models:**
  - **Star Micronics TSP143IV (X4):** Multi-interface (USB-C + LAN + WLAN + Bluetooth + CloudPRNT).
  - **Epson TM-m30II / TM-T20III:** Universal ESC/POS standard, compact cube footprint for tight counter spaces.
- **Paper Specification:** 80mm wide thermal roll paper (3 1/8" width, 230ft length, 48 column default font).

### 3.2 BOH Kitchen Printer (Impact / Dot-Matrix)
- **Why Impact Is Mandatory for BOH:**
  Thermal paper turns completely black when exposed to radiant heat above 140°F (60°C). Installing a thermal printer on a sauté, grill, or wok line will destroy kitchen tickets within minutes.
- **Certified Models:** **Star SP742** (with Ethernet LAN) or **Epson TM-U220B**.
- **Ribbon:** Two-color red/black ink ribbon (RC700BR). CulinaryOS encodes red ink highlighting for modifiers, allergies, and rush tickets.

### 3.3 Cash Drawer & DK Port Pinout
- **Operating Model:** Printer-driven drawer. The cash drawer solenoid connects directly to the **DK (Drawer Kick)** RJ12 port on the back of the thermal printer.
- **Electrical Voltage:** **24V DC**.
- **Cabling Warning:**
  Standard telephone RJ11 cables are 4-wire or 2-wire and are NOT wired the same as POS-grade RJ12 (6-pin) cash drawer cables. Plugging a telephone cable into a printer DK port can cause solenoid coil burnout or intermittent failure. Always use manufacturer-supplied POS RJ12 cables (Pin 2 = Solenoid (+), Pin 4 = 24V Drive, Pin 3/6 = Microswitch sensor).
- **ESC/POS Command:**
  - Pulse Pin 2 (Drawer 1): 0x1B 0x70 0x00 0x19 0xFA (25ms on, 250ms off)
  - Pulse Pin 5 (Drawer 2): 0x1B 0x70 0x01 0x19 0xFA

### 3.4 Payment Terminal (Stripe Terminal)
- **Models:** Stripe WisePOS E (Countertop Ethernet/Wi-Fi), Stripe S700 (Handheld All-in-One).
- **PCI Scope & Architecture:** Card-present payments operate exclusively through Stripe Terminal SDK. Card numbers and CVVs never touch CulinaryOS application memory or servers, qualifying the merchant for the lightest SAQ-A class.
- **Offline Card Collection:** Supported via Stripe Terminal local forward-and-store on network loss, auto-capturing upon reconnect.

---

## 4. Diagnostics & Remote Verification Runbook

All certified hardware components can be audited and tested directly from the terminal via the CulinaryOS CLI:

```bash
# 1. Display Certified Hardware Bill of Materials & Pricing
culinary hardware bom

# 2. Print Diagnostic Thermal Test Receipt with QR Code & Cut
culinary hardware test-receipt --ip 192.168.1.200 --port 9100

# 3. Trigger Cash Drawer Solenoid Kick Pulse
culinary hardware kick-drawer --ip 192.168.1.200 --port 9100

# 4. Scan Local Subnet for Port 9100 ESC/POS Printers
culinary hardware scan
```

---

*Version: 1.0 | CulinaryOS Stage 7 Hardware Certification Architecture*
