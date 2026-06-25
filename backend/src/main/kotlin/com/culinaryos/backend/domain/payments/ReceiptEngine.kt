package com.culinaryos.backend.domain.payments

import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * ReceiptEngine — pure function, no DB access.
 *
 * Renders ReceiptData into:
 *   1. HTML string (stored in receipts.html_content, used for email delivery)
 *   2. ESC/POS byte sequence (sent to Star Micronics thermal printer via POS client)
 *
 * The ESC/POS byte sequence is documented in docs/escpos-receipt-spec.md.
 * At MVP, the Compose Multiplatform POS client sends the byte array to the
 * printer over USB or LAN. No server-side printer driver is needed.
 */
object ReceiptEngine {

    private val DATE_FMT = DateTimeFormatter.ofPattern("MMM dd yyyy  hh:mm a")

    // ─── HTML Renderer ──────────────────────────────────────────────────────────

    fun renderHtml(data: ReceiptData, tz: ZoneId = ZoneId.of("UTC")): String {
        val dateStr = data.processedAt.atZone(tz).format(DATE_FMT)
        val linesHtml = data.lines.joinToString("\n") { line ->
            val mods = if (line.modifiers.isNotBlank()) """
                <div class="mod">  + ${line.modifiers}</div>""".trimIndent() else ""
            """
            <tr>
              <td>${line.quantity}× ${line.name}$mods</td>
              <td class="right">${formatCents(line.lineTotalCents)}</td>
            </tr>""".trimIndent()
        }

        val changeRow = if (data.changeCents > 0) """
            <tr class="change">
              <td>Change</td>
              <td class="right">${formatCents(data.changeCents)}</td>
            </tr>""".trimIndent() else ""

        val tipRow = if (data.tipCents > 0) """
            <tr>
              <td>Tip</td>
              <td class="right">${formatCents(data.tipCents)}</td>
            </tr>""".trimIndent() else ""

        return """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Receipt ${data.receiptNumber}</title>
  <style>
    body  { font-family: 'Courier New', monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 8px; }
    h1    { text-align: center; font-size: 14px; margin: 0 0 4px; }
    .sub  { text-align: center; font-size: 11px; color: #555; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    td    { padding: 2px 0; vertical-align: top; }
    .right { text-align: right; }
    .mod  { font-size: 10px; color: #666; padding-left: 8px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .total td { font-weight: bold; border-top: 1px solid #000; padding-top: 4px; }
    .change td { font-style: italic; }
    .footer { text-align: center; font-size: 10px; margin-top: 10px; color: #555; }
  </style>
</head>
<body>
  <h1>${data.restaurantName}</h1>
  ${if (!data.restaurantAddress.isNullOrBlank()) "<div class='sub'>${data.restaurantAddress}</div>" else ""}
  <div class="sub">$dateStr</div>
  <div class="sub">Receipt: ${data.receiptNumber}</div>
  ${if (data.serverName != null) "<div class='sub'>Server: ${data.serverName}</div>" else ""}
  <div class="divider"></div>
  <table>
    $linesHtml
    <tr class="divider"><td colspan="2"></td></tr>
    <tr><td>Subtotal</td><td class="right">${formatCents(data.subtotalCents)}</td></tr>
    $tipRow
    <tr class="total"><td>TOTAL</td><td class="right">${formatCents(data.totalCents)}</td></tr>
    <tr><td>${data.paymentMethod}</td><td class="right">${formatCents(data.amountPaidCents)}</td></tr>
    $changeRow
  </table>
  <div class="divider"></div>
  <div class="footer">Thank you! • Powered by CulinaryOS</div>
</body>
</html>""".trimIndent()
    }

    // ─── ESC/POS Byte Sequence ──────────────────────────────────────────────────
    // Returns the raw byte array to send directly to a Star Micronics or
    // Epson TM-series ESC/POS thermal printer.
    //
    // The Compose Multiplatform POS client receives this as a Base64-encoded
    // string from the /payments/receipt/{id}/escpos endpoint and sends it
    // to the printer via USB (Android) or TCP socket (LAN, port 9100).
    //
    // ESC/POS command reference: docs/escpos-receipt-spec.md

    fun renderEscPos(data: ReceiptData, tz: ZoneId = ZoneId.of("UTC")): ByteArray {
        val dateStr = data.processedAt.atZone(tz).format(DATE_FMT)
        val buf = mutableListOf<Byte>()

        fun esc(vararg bytes: Int) = bytes.forEach { buf.add(it.toByte()) }
        fun text(s: String) = buf.addAll(s.toByteArray(Charsets.US_ASCII).toList())
        fun lf() = buf.add(0x0A)
        fun cut() { esc(0x1B, 0x69) }  // ESC i — full cut

        // Initialize printer
        esc(0x1B, 0x40)  // ESC @ — initialize

        // Center + bold restaurant name
        esc(0x1B, 0x61, 0x01)  // ESC a 1 — center
        esc(0x1B, 0x45, 0x01)  // ESC E 1 — bold on
        text(data.restaurantName.take(32))
        lf()
        esc(0x1B, 0x45, 0x00)  // ESC E 0 — bold off

        data.restaurantAddress?.let { addr ->
            text(addr.take(32)); lf()
        }
        text(dateStr); lf()
        text("Receipt: ${data.receiptNumber}"); lf()
        data.serverName?.let { text("Server: $it"); lf() }

        // Left align + divider
        esc(0x1B, 0x61, 0x00)  // ESC a 0 — left
        text("-".repeat(32)); lf()

        // Line items
        data.lines.forEach { line ->
            val desc = "${line.quantity}x ${line.name}".take(22)
            val price = formatCents(line.lineTotalCents)
            val padding = 32 - desc.length - price.length
            text(desc + " ".repeat(padding.coerceAtLeast(1)) + price); lf()
            if (line.modifiers.isNotBlank()) {
                text("  + ${line.modifiers}".take(32)); lf()
            }
        }

        text("-".repeat(32)); lf()

        fun twoCol(label: String, value: String) {
            val pad = 32 - label.length - value.length
            text(label + " ".repeat(pad.coerceAtLeast(1)) + value); lf()
        }

        twoCol("Subtotal", formatCents(data.subtotalCents))
        if (data.tipCents > 0) twoCol("Tip", formatCents(data.tipCents))

        // Bold total
        esc(0x1B, 0x45, 0x01)
        twoCol("TOTAL", formatCents(data.totalCents))
        esc(0x1B, 0x45, 0x00)

        twoCol(data.paymentMethod, formatCents(data.amountPaidCents))
        if (data.changeCents > 0) twoCol("Change", formatCents(data.changeCents))

        text("-".repeat(32)); lf()

        // Footer — centered
        esc(0x1B, 0x61, 0x01)
        text("Thank you!"); lf()
        text("Powered by CulinaryOS"); lf()
        lf(); lf(); lf()  // feed before cut

        cut()

        return buf.toByteArray()
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    fun formatCents(cents: Int): String {
        val dollars = cents / 100
        val c       = cents % 100
        return "\$$dollars.${c.toString().padStart(2, '0')}"
    }
}
