package com.culinaryos.backend.domain.inventory

import com.culinaryos.backend.domain.auth.Restaurants
import com.culinaryos.backend.domain.auth.Users
import com.culinaryos.backend.domain.pos.MenuItems
import com.culinaryos.backend.domain.pos.OrderLines
import com.culinaryos.backend.domain.pos.Orders
import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.timestamp

object StorageLocations : UUIDTable("storage_locations") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val name         = text("name")
    val createdAt    = timestamp("created_at")
}

object InventoryItems : UUIDTable("inventory_items") {
    val restaurantId      = reference("restaurant_id", Restaurants)
    val storageLocationId = reference("storage_location_id", StorageLocations).nullable()
    val name              = text("name")
    val unit              = text("unit").default("each")
    val currentQuantity   = decimal("current_quantity", 12, 4).default(java.math.BigDecimal.ZERO)
    val parLevel          = decimal("par_level", 12, 4).default(java.math.BigDecimal.ZERO)
    val reorderQuantity   = decimal("reorder_quantity", 12, 4).default(java.math.BigDecimal.ZERO)
    val costPerUnitCents  = integer("cost_per_unit_cents").default(0)
    val isActive          = bool("is_active").default(true)
    val createdAt         = timestamp("created_at")
    val updatedAt         = timestamp("updated_at")
}

object MenuItemIngredients : UUIDTable("menu_item_ingredients") {
    val restaurantId      = reference("restaurant_id", Restaurants)
    val menuItemId        = reference("menu_item_id", MenuItems)
    val inventoryItemId   = reference("inventory_item_id", InventoryItems)
    val quantityUsed      = decimal("quantity_used", 12, 4)
}

object DepletionEvents : UUIDTable("depletion_events") {
    val restaurantId      = reference("restaurant_id", Restaurants)
    val inventoryItemId   = reference("inventory_item_id", InventoryItems)
    val source            = text("source")
    val quantityDelta     = decimal("quantity_delta", 12, 4)
    val orderId           = reference("order_id", Orders).nullable()
    val orderLineId       = reference("order_line_id", OrderLines).nullable()
    val actorId           = reference("actor_id", Users).nullable()
    val notes             = text("notes").nullable()
    val occurredAt        = timestamp("occurred_at")
}

object ReorderRules : UUIDTable("reorder_rules") {
    val restaurantId      = reference("restaurant_id", Restaurants)
    val inventoryItemId   = reference("inventory_item_id", InventoryItems)
    val vendorName        = text("vendor_name").nullable()
    val vendorContact     = text("vendor_contact").nullable()
    val autoDraft         = bool("auto_draft").default(false)
    val createdAt         = timestamp("created_at")
}

object PurchaseOrders : UUIDTable("purchase_orders") {
    val restaurantId   = reference("restaurant_id", Restaurants)
    val status         = text("status").default("DRAFT")
    val vendorName     = text("vendor_name").nullable()
    val linesJson      = text("lines_json").default("[]")
    val totalCostCents = integer("total_cost_cents").default(0)
    val notes          = text("notes").nullable()
    val createdBy      = reference("created_by", Users).nullable()
    val submittedAt    = timestamp("submitted_at").nullable()
    val receivedAt     = timestamp("received_at").nullable()
    val createdAt      = timestamp("created_at")
    val updatedAt      = timestamp("updated_at")
}
