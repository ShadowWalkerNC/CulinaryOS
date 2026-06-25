# CulinaryOS — ESC/POS Receipt Spec

This document defines the ESC/POS command sequence used by `ReceiptEngine.renderEscPos()`.
The Compose Multiplatform POS client sends this byte array directly to the printer.

## Supported Printers

- **Star Micronics** mC-Print2, mC-Print3, TSP100, TSP650
- **Epson** TM-T88, TM-T20, TM-U220 (ESC/POS compatible)
- Any printer supporting the **STAR Line Mode** or **ESC/POS** command set

## Connection Methods (POS Client)

| Method | How | Android | Desktop |
|---|---|---|---|
| USB | UsbManager API (Android) / javax.usb (Desktop) | ✅ | ✅ |
| LAN (TCP) | TCP socket to port 9100 | ✅ | ✅ |
| Bluetooth | BluetoothSocket (Android) | ✅ | Limited |

## Command Reference Used

| Command | Hex | Purpose |
|---|---|---|
| `ESC @` | `1B 40` | Initialize / reset printer |
| `ESC a 0` | `1B 61 00` | Left align |
| `ESC a 1` | `1B 61 01` | Center align |
| `ESC E 1` | `1B 45 01` | Bold on |
| `ESC E 0` | `1B 45 00` | Bold off |
| `LF` | `0A` | Line feed (new line) |
| `ESC i` | `1B 69` | Full paper cut |

## Receipt Layout

```
[CENTER] [BOLD] Restaurant Name
[CENTER] Restaurant Address (if set)
[CENTER] Date/Time
[CENTER] Receipt: RCP-2026-0001
[CENTER] Server: Jane (if set)
--------------------------------
[LEFT]  2x Ribeye         $50.00
[LEFT]    + Medium Rare
[LEFT]  1x House Salad     $9.00
--------------------------------
[LEFT]  Subtotal          $59.00
[LEFT]  Tip                $8.85
[BOLD]  TOTAL             $67.85
[LEFT]  CASH              $80.00
[LEFT]  Change            $12.15
--------------------------------
[CENTER] Thank you!
[CENTER] Powered by CulinaryOS
[FEED x3]
[CUT]
```

## POS Client Integration (Kotlin)

```kotlin
// Fetch ESC/POS bytes from server
val base64 = apiClient.get("/payments/receipt/$receiptId/escpos")
val bytes  = Base64.decode(base64, Base64.DEFAULT)

// Send to LAN printer (TCP port 9100)
val socket = Socket("192.168.1.100", 9100)
socket.getOutputStream().write(bytes)
socket.close()

// Send to USB printer (Android)
val connection = usbManager.openDevice(printerDevice)
connection.bulkTransfer(endpoint, bytes, bytes.size, 3000)
```

## Paper Width

- **58mm paper (default):** 32 characters per line @ 12pt monospace
- **80mm paper:** increase to 42 characters per line by adjusting `ReceiptEngine` `COL_WIDTH`

## Error Handling

- If the printer is unreachable, the POS client must NOT block the payment flow
- Receipt is always stored server-side in `receipts.html_content` for reprinting
- Reprint available at any time via `GET /payments/receipt/{id}`
