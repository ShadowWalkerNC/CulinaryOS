package com.culinaryos.backend.domain.payments

import com.culinaryos.backend.plugins.restaurantId
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.UUID

fun Route.paymentRoutes(service: PaymentService) {

    authenticate("jwt") {

        // ─── Record payment (closes order + generates receipt) ─────────────────────
        // POST /payments/record
        post("/payments/record") {
            val rid = UUID.fromString(call.restaurantId())
            val req = call.receive<RecordPaymentRequest>()
            val res = service.recordPayment(rid, req)
            call.respond(HttpStatusCode.Created, res)
        }

        // ─── Cash change calculator (pure, no state) ──────────────────────────
        // POST /payments/change
        // Called by POS UI when cashier enters tender amount — returns change instantly.
        post("/payments/change") {
            val req = call.receive<ChangeCalcRequest>()
            call.respond(service.calculateChange(req))
        }

        // ─── Get receipt HTML ──────────────────────────────────────────────────
        // GET /payments/receipt/{id}
        get("/payments/receipt/{id}") {
            val rid       = UUID.fromString(call.restaurantId())
            val receiptId = UUID.fromString(call.parameters["id"]!!)
            val receipt   = service.getReceipt(receiptId, rid)
            call.respondText(receipt.htmlContent, ContentType.Text.Html)
        }

        // ─── Get ESC/POS byte array (Base64) for thermal printer ────────────────
        // GET /payments/receipt/{id}/escpos
        // Compose POS client fetches this and sends bytes to USB/LAN printer.
        get("/payments/receipt/{id}/escpos") {
            val rid       = UUID.fromString(call.restaurantId())
            val receiptId = UUID.fromString(call.parameters["id"]!!)
            val base64    = service.getEscPosReceipt(receiptId, rid)
            call.respondText(base64, ContentType.Text.Plain)
        }
    }
}
