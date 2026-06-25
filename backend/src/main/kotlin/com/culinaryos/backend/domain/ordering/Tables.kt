package com.culinaryos.backend.domain.ordering

import com.culinaryos.backend.domain.auth.Restaurants
import com.culinaryos.backend.domain.auth.Users
import com.culinaryos.backend.domain.pos.Orders
import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.timestamp

object MenuSnapshots : UUIDTable("menu_snapshots") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val version      = integer("version").default(1)
    val status       = text("status").default("DRAFT")
    val publishedBy  = reference("published_by", Users).nullable()
    val publishedAt  = timestamp("published_at").nullable()
    val snapshotJson = text("snapshot_json").default("{}")
    val createdAt    = timestamp("created_at")
}

object CustomerOrders : UUIDTable("customer_orders") {
    val restaurantId        = reference("restaurant_id", Restaurants)
    val menuSnapshotId      = reference("menu_snapshot_id", MenuSnapshots)
    val fulfillmentType     = text("fulfillment_type")
    val customerName        = text("customer_name")
    val customerEmail       = text("customer_email").nullable()
    val customerPhone       = text("customer_phone").nullable()
    val deliveryAddress     = text("delivery_address").nullable()
    val specialInstructions = text("special_instructions").nullable()
    val linesJson           = text("lines_json").default("[]")
    val subtotalCents       = integer("subtotal_cents").default(0)
    val status              = text("status").default("RECEIVED")
    val posOrderId          = reference("pos_order_id", Orders).nullable()
    val trackingToken       = text("tracking_token")
    val createdAt           = timestamp("created_at")
    val updatedAt           = timestamp("updated_at")
}

object CustomerOrderStatusEvents : UUIDTable("customer_order_status_events") {
    val customerOrderId = reference("customer_order_id", CustomerOrders)
    val restaurantId    = reference("restaurant_id", Restaurants)
    val fromStatus      = text("from_status")
    val toStatus        = text("to_status")
    val occurredAt      = timestamp("occurred_at")
    val actorId         = reference("actor_id", Users).nullable()
}
