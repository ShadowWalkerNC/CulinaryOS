package com.culinaryos.backend.domain.payments

import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.UUID

// ─── Domain Models ────────────────────────────────────────────────────────────

data class PaymentIntent(
    val id: UUID,
    val restaurantId: UUID,
    val orderId: UUID,
    val receiptNumber: String,
    val method: PaymentMethod,
    val amountCents: Int,
    val tipCents: Int,
    val totalCents: Int,
    val tenderAmountCents: Int,
    val changeCents: Int,
    val status: PaymentStatus,
    val processedBy: UUID?,
    val processedAt: Instant,
    val notes: String?
)

enum class PaymentMethod { CASH, OTHER }
enum class PaymentStatus { COMPLETED, REFUNDED, VOIDED }

data class Receipt(
    val id: UUID,
    val restaurantId: UUID,
    val paymentIntentId: UUID,
    val receiptNumber: String,
    val htmlContent: String,
    val deliveryMethod: ReceiptDelivery,
    val deliveredTo: String?,
    val createdAt: Instant
)

enum class ReceiptDelivery { PRINT, EMAIL, SMS, NONE }

/**
 * Intermediate model used by ReceiptEngine to render the HTML template.
 * All data needed for one receipt — no further DB queries needed after this is built.
 */
data class ReceiptData(
    val restaurantName: String,
    val restaurantAddress: String?,
    val receiptNumber: String,
    val processedAt: Instant,
    val lines: List<ReceiptLine>,
    val subtotalCents: Int,
    val tipCents: Int,
    val totalCents: Int,
    val amountPaidCents: Int,
    val changeCents: Int,
    val paymentMethod: String,
    val serverName: String?
)

data class ReceiptLine(
    val name: String,
    val quantity: Int,
    val unitPriceCents: Int,
    val lineTotalCents: Int,
    val modifiers: String
)

// ─── Request DTOs ────────────────────────────────────────────────────────────

@Serializable
data class RecordPaymentRequest(
    val orderId: String,
    val method: String = "CASH",       // CASH | OTHER
    val amountCents: Int,
    val tipCents: Int = 0,
    val tenderAmountCents: Int = 0,    // 0 = exact change / non-cash
    val processedBy: String? = null,
    val deliveryMethod: String = "PRINT",  // PRINT | EMAIL | SMS | NONE
    val deliveredTo: String? = null,
    val notes: String? = null
)

@Serializable
data class PaymentResponse(
    val paymentIntentId: String,
    val receiptNumber: String,
    val totalCents: Int,
    val changeCents: Int,
    val method: String,
    val status: String,
    val receiptId: String
)

@Serializable
data class ChangeCalcRequest(
    val amountCents: Int,
    val tenderAmountCents: Int
)

@Serializable
data class ChangeCalcResponse(
    val changeCents: Int,
    val changeFormatted: String   // e.g. "$4.25"
)
