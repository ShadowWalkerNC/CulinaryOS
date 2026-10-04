# CulinaryOS Hardware Architecture & Peripheral Integration

> **Document Version:** 1.0.0
> **Status:** Architecture Specification & Hardware BOM
> **Target Peripheral Set:** Thermal Receipts, Kitchen Printers, Cash Drawers, Scales, Scanners, IoT Probes

---

## 1. Hardware Philosophy & Non-Lock-In Standard

CulinaryOS rejects the proprietary terminal lock-in model ($800–$1,200 per terminal forced by legacy vendors). The platform operates on universal standards:
1. **Universal Protocol:** Standard ESC/POS over Network (LAN/Wi-Fi), USB, Bluetooth, or CloudPRNT.
2. **Printer-Driven Peripherals:** Cash drawers connect to the standard RJ11/RJ12 DK kick port on receipt printers (matching 24V pinouts).
3. **Bring-Your-Own Tablets:** Web-first architecture runs identically across iPads, Android tablets, touchscreen PCs, and Raspberry Pi displays.
4. **Certified First-Party Payments:** Out-of-the-box support for Stripe Terminal (WisePOS E countertop, S700 / S710 handheld readers) to achieve strict SAQ-A PCI compliance.

---

## 2. Certified Hardware Bill of Materials (BOM)

| Role | Device Model | Connectivity | Protocol / Standard | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Receipt Printer (FOH)** | Star TSP143IV / TSP100IV OR Epson TM-m30 | USB-C / LAN / Wi-Fi / CloudPRNT | Raw ESC/POS | High-speed thermal, autocutter, internal power supply |
| **Kitchen Printer (BOH)** | Star SP742 Impact OR Epson TM-U220 | Ethernet LAN | Impact Dot-Matrix (9-pin) | Two-color (black/red) ribbon; withstands kitchen steam & heat |
| **Cash Drawer** | APG Vasario Series (or compatible 24V) | RJ11 / RJ12 | Printer DK Port Kick (Pin 2 / Pin 5) | Plugs directly into thermal receipt printer, not the tablet |
| **Payment Reader** | Stripe WisePOS E / S700 | Wi-Fi / Ethernet Dock | Stripe Terminal SDK | Encrypted card-present reader; offline PIN / intent support |
| **Barcode Scanner** | Honeywell Voyager 1200g / Zebra DS2208 | USB HID / Bluetooth | Keyboard Emulation (HID) | Barcode reading for inventory receiving and table tickets |
| **Kitchen Scale** | Dymo M25 / M10 / Fairbanks SCB | USB HID / RS-232 Serial | Scale POS Protocol | Accurate portion control and recipe batch weighing |
| **HACCP Temp Probe** | Cooper-Atkins Blue2 / Testo Saveris | Bluetooth Low Energy (BLE) | GATT Service (Temperature) | Automated walk-in, line cooler, and food temp recording |

---

## 3. Peripheral Driver Abstraction (`hardware/drivers/`)

CulinaryOS defines strict driver interfaces before raw implementation:

```typescript
// hardware/drivers/printer.ts
export interface ReceiptPrinterDriver {
  connect(target: string): Promise<boolean>;
  printRaw(data: Uint8Array): Promise<void>;
  printReceipt(receipt: OrderReceiptData): Promise<void>;
  openCashDrawer(): Promise<void>;
  getStatus(): Promise<{ online: boolean; paperLow: boolean; coverOpen: boolean }>;
}

// hardware/drivers/scale.ts
export interface KitchenScaleDriver {
  connect(): Promise<boolean>;
  readWeight(): Promise<{ weight: number; unit: 'g' | 'oz' | 'lb' | 'kg'; stable: boolean }>;
  tare(): Promise<void>;
}

// hardware/drivers/probe.ts
export interface TemperatureProbeDriver {
  discoverProbes(): Promise<Array<{ id: string; name: string; rssi: number }>>;
  readTemperature(probeId: string): Promise<{ tempF: number; tempC: number; timestamp: number }>;
}
```

---

## 4. Cash Drawer Wiring Verification

> [!WARNING]
> Cash drawers connect to the **Printer's DK Port**, never directly to a tablet.
> Phone cables and POS drawer cables look identical (both RJ11/RJ12), but phone cables are wired differently and **can damage the printer solenoid**. Always use certified POS kick cables wired for 24V pulse on Pin 2/Pin 5.
