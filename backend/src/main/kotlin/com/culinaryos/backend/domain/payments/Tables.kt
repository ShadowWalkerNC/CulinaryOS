package com.culinaryos.backend.domain.payments

import com.culinaryos.backend.domain.auth.Restaurants
import com.culinaryos.backend.domain.auth.Users
import com.culinaryos.backend.domain.pos.Orders
import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.timestamp

object PaymentIntents : UUIDTable("payment_intents") {
    val restaurantId      = reference("restaurant_id", Restaurants)
    val orderId           = reference("order_id", Orders)
    val receiptNumber     = text("receipt_number")
    val method            = text("method").default("CASH")
    val amountCents       = integer("amount_cents")
    val tipCents          = integer("tip_cents").default(0)
    val totalCents        = integer("total_cents")
    val tenderAmountCents = integer("tender_amount_cents").default(0)
    val changeCents       = integer("change_cents").default(0)
    val status            = text("status").default("COMPLETED")
    val processedBy       = reference("processed_by", Users).nullable()
    val processedAt       = timestamp("processed_at")
    val notes             = text("notes").nullable()
}

object Receipts : UUIDTable("receipts") {
    val restaurantId    = reference("restaurant_id", Restaurants)
    val paymentIntentId = reference("payment_intent_id", PaymentIntents)
    val receiptNumber   = text("receipt_number")
    val htmlContent     = text("html_content")
    val deliveryMethod  = text("delivery_method").default("PRINT")
    val deliveredTo     = text("delivered_to").nullable()
    val createdAt       = timestamp("created_at")
}
