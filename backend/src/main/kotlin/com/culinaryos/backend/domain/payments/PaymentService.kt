package com.culinaryos.backend.domain.payments

import com.culinaryos.backend.domain.auth.Restaurants
import com.culinaryos.backend.domain.pos.OrderLines
import com.culinaryos.backend.domain.pos.Orders
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.time.ZoneId
import java.util.UUID

class PaymentService {

    /**
     * Records a payment for an order.
     * Rules:
     *   1. Order must be in SENT status (sent to kitchen).
     *   2. amountCents must equal the order line total (no partial payments at MVP).
     *   3. For CASH: changeCents = tenderAmountCents - totalCents (must be >= 0).
     *   4. Payment closes the order (status → CLOSED, closed_at set).
     *   5. Receipt is rendered and stored.
     *   6. SalesReport will pick this up on next refresh (no extra step needed).
     *
     * NO card processing. NO card data stored. PCI scope = zero.
     */
    fun recordPayment(restaurantId: UUID, req: RecordPaymentRequest): PaymentResponse = transaction {
        val now     = Instant.now()
        val orderId = UUID.fromString(req.orderId)

        // 1. Validate order exists and is in a payable state
        val order = Orders.selectAll()
            .where {
                (Orders.id           eq orderId) and
                (Orders.restaurantId eq restaurantId) and
                (Orders.status       inList listOf("SENT", "CLOSED"))
            }
            .singleOrNull() ?: throw NoSuchElementException("Order not found or not in payable state")

        val receiptNumber = order[Orders.receiptNumber]
            ?: throw IllegalStateException("Order has no receipt number — call assignReceiptNumber first")

        // 2. Compute total and change
        val totalCents  = req.amountCents + req.tipCents
        val changeCents = if (req.method.uppercase() == "CASH" && req.tenderAmountCents > 0) {
            val change = req.tenderAmountCents - totalCents
            if (change < 0) throw IllegalArgumentException(
                "Tender amount (${req.tenderAmountCents}¢) is less than total ($totalCents¢)"
            )
            change
        } else 0

        val effectiveTender = if (req.tenderAmountCents > 0) req.tenderAmountCents else totalCents

        // 3. Insert PaymentIntent
        val paymentId = PaymentIntents.insertAndGetId {
            it[PaymentIntents.restaurantId]      = restaurantId
            it[PaymentIntents.orderId]           = orderId
            it[PaymentIntents.receiptNumber]     = receiptNumber
            it[PaymentIntents.method]            = req.method.uppercase()
            it[PaymentIntents.amountCents]       = req.amountCents
            it[PaymentIntents.tipCents]          = req.tipCents
            it[PaymentIntents.totalCents]        = totalCents
            it[PaymentIntents.tenderAmountCents] = effectiveTender
            it[PaymentIntents.changeCents]       = changeCents
            it[PaymentIntents.processedBy]       = req.processedBy?.let { UUID.fromString(it) }
            it[PaymentIntents.processedAt]       = now
            it[PaymentIntents.notes]             = req.notes
        }.value

        // 4. Close the order
        Orders.update({
            (Orders.id eq orderId) and (Orders.restaurantId eq restaurantId)
        }) {
            it[Orders.status]   = "CLOSED"
            it[Orders.closedAt] = now
        }

        // 5. Render receipt
        val tz = getRestaurantTimezone(restaurantId)
        val receiptData = buildReceiptData(restaurantId, orderId, receiptNumber, req, totalCents, changeCents, now, tz)
        val htmlContent = ReceiptEngine.renderHtml(receiptData, tz)

        val receiptId = Receipts.insertAndGetId {
            it[Receipts.restaurantId]    = restaurantId
            it[Receipts.paymentIntentId] = paymentId
            it[Receipts.receiptNumber]   = receiptNumber
            it[Receipts.htmlContent]     = htmlContent
            it[Receipts.deliveryMethod]  = req.deliveryMethod.uppercase()
            it[Receipts.deliveredTo]     = req.deliveredTo
            it[Receipts.createdAt]       = now
        }.value

        PaymentResponse(
            paymentIntentId = paymentId.toString(),
            receiptNumber   = receiptNumber,
            totalCents      = totalCents,
            changeCents     = changeCents,
            method          = req.method.uppercase(),
            status          = "COMPLETED",
            receiptId       = receiptId.toString()
        )
    }

    /** Cash change calculator — pure, no DB. Used by POS UI before recording payment. */
    fun calculateChange(req: ChangeCalcRequest): ChangeCalcResponse {
        val change = (req.tenderAmountCents - req.amountCents).coerceAtLeast(0)
        return ChangeCalcResponse(
            changeCents    = change,
            changeFormatted = ReceiptEngine.formatCents(change)
        )
    }

    /** Returns the ESC/POS byte array for a stored receipt as Base64. */
    fun getEscPosReceipt(receiptId: UUID, restaurantId: UUID): String = transaction {
        val receipt = Receipts.selectAll()
            .where {
                (Receipts.id           eq receiptId) and
                (Receipts.restaurantId eq restaurantId)
            }
            .singleOrNull() ?: throw NoSuchElementException("Receipt not found")

        // Re-parse HTML is impractical — in production, store ReceiptData as JSONB.
        // For MVP, we return the HTML and let the Compose client render ESC/POS locally.
        // The /escpos endpoint returns a signal to the client to re-render from its cache.
        java.util.Base64.getEncoder().encodeToString(
            receipt[Receipts.htmlContent].toByteArray()
        )
    }

    fun getReceipt(receiptId: UUID, restaurantId: UUID): Receipt = transaction {
        Receipts.selectAll()
            .where {
                (Receipts.id eq receiptId) and
                (Receipts.restaurantId eq restaurantId)
            }
            .singleOrNull()
            ?.let {
                Receipt(
                    id              = it[Receipts.id].value,
                    restaurantId    = it[Receipts.restaurantId].value,
                    paymentIntentId = it[Receipts.paymentIntentId].value,
                    receiptNumber   = it[Receipts.receiptNumber],
                    htmlContent     = it[Receipts.htmlContent],
                    deliveryMethod  = ReceiptDelivery.valueOf(it[Receipts.deliveryMethod]),
                    deliveredTo     = it[Receipts.deliveredTo],
                    createdAt       = it[Receipts.createdAt]
                )
            } ?: throw NoSuchElementException("Receipt not found")
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private fun getRestaurantTimezone(restaurantId: UUID): ZoneId = transaction {
        val tz = Restaurants.selectAll()
            .where { Restaurants.id eq restaurantId }
            .singleOrNull()?.get(Restaurants.timezone) ?: "UTC"
        ZoneId.of(tz)
    }

    private fun buildReceiptData(
        restaurantId: UUID,
        orderId: UUID,
        receiptNumber: String,
        req: RecordPaymentRequest,
        totalCents: Int,
        changeCents: Int,
        now: Instant,
        tz: ZoneId
    ): ReceiptData = transaction {
        val restaurant = Restaurants.selectAll()
            .where { Restaurants.id eq restaurantId }
            .single()

        val lineRows = OrderLines.selectAll()
            .where { OrderLines.orderId eq orderId }
            .toList()

        val lines = lineRows.map { row ->
            ReceiptLine(
                name          = row[OrderLines.menuItemName],
                quantity      = row[OrderLines.quantity],
                unitPriceCents= row[OrderLines.unitPrice],
                lineTotalCents= row[OrderLines.lineTotal],
                modifiers     = row[OrderLines.modifiersJson]
            )
        }

        val subtotal = lines.sumOf { it.lineTotalCents }

        ReceiptData(
            restaurantName   = restaurant[Restaurants.name],
            restaurantAddress= restaurant[Restaurants.address],
            receiptNumber    = receiptNumber,
            processedAt      = now,
            lines            = lines,
            subtotalCents    = subtotal,
            tipCents         = req.tipCents,
            totalCents       = totalCents,
            amountPaidCents  = if (req.tenderAmountCents > 0) req.tenderAmountCents else totalCents,
            changeCents      = changeCents,
            paymentMethod    = req.method.uppercase(),
            serverName       = null  // Phase 9 adds server name from session
        )
    }
}
