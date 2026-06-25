package com.culinaryos.backend.domain.pos

import com.culinaryos.backend.domain.auth.Restaurants
import com.culinaryos.backend.domain.auth.Users
import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.timestamp

object MenuCategories : UUIDTable("menu_categories") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val name         = text("name")
    val sortOrder    = integer("sort_order").default(0)
    val isActive     = bool("is_active").default(true)
    val createdAt    = timestamp("created_at")
    val updatedAt    = timestamp("updated_at")
}

object MenuItems : UUIDTable("menu_items") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val categoryId   = reference("category_id", MenuCategories).nullable()
    val name         = text("name")
    val description  = text("description").nullable()
    val price        = decimal("price", 10, 2)
    val stationTags  = array<String>("station_tags")
    val isActive     = bool("is_active").default(true)
    val sortOrder    = integer("sort_order").default(0)
    val createdAt    = timestamp("created_at")
    val updatedAt    = timestamp("updated_at")
}

object ModifierGroups : UUIDTable("modifier_groups") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val name         = text("name")
    val minSelect    = integer("min_select").default(0)
    val maxSelect    = integer("max_select").default(1)
    val isRequired   = bool("is_required").default(false)
    val createdAt    = timestamp("created_at")
}

object Modifiers : UUIDTable("modifiers") {
    val modifierGroupId = reference("modifier_group_id", ModifierGroups)
    val restaurantId    = reference("restaurant_id", Restaurants)
    val name            = text("name")
    val priceDelta      = decimal("price_delta", 10, 2).default(java.math.BigDecimal.ZERO)
    val isActive        = bool("is_active").default(true)
    val sortOrder       = integer("sort_order").default(0)
}

object Sections : UUIDTable("sections") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val name         = text("name")
    val sortOrder    = integer("sort_order").default(0)
    val createdAt    = timestamp("created_at")
}

object DiningTables : UUIDTable("dining_tables") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val sectionId    = reference("section_id", Sections).nullable()
    val name         = text("name")
    val capacity     = integer("capacity").default(2)
    val status       = text("status").default("AVAILABLE")
    val createdAt    = timestamp("created_at")
    val updatedAt    = timestamp("updated_at")
}

object Orders : UUIDTable("orders") {
    val restaurantId  = reference("restaurant_id", Restaurants)
    val tableId       = reference("table_id", DiningTables).nullable()
    val openedBy      = reference("opened_by", Users)
    val status        = text("status").default("OPEN")
    val source        = text("source").default("POS")
    val receiptNumber = text("receipt_number").nullable()
    val coverCount    = integer("cover_count").default(1)
    val notes         = text("notes").nullable()
    val createdAt     = timestamp("created_at")
    val updatedAt     = timestamp("updated_at")
}

object OrderLines : UUIDTable("order_lines") {
    val orderId       = reference("order_id", Orders)
    val restaurantId  = reference("restaurant_id", Restaurants)
    val menuItemId    = reference("menu_item_id", MenuItems)
    val menuItemName  = text("menu_item_name")
    val unitPrice     = decimal("unit_price", 10, 2)
    val quantity      = integer("quantity").default(1)
    val stationTags   = array<String>("station_tags")
    val modifiersJson = text("modifiers_json").default("[]")
    val lineTotal     = decimal("line_total", 10, 2)
    val status        = text("status").default("PENDING")
    val voidReason    = text("void_reason").nullable()
    val voidedBy      = reference("voided_by", Users).nullable()
    val voidedAt      = timestamp("voided_at").nullable()
    val createdAt     = timestamp("created_at")
}

object OrderAdjustments : UUIDTable("order_adjustments") {
    val orderId      = reference("order_id", Orders)
    val restaurantId = reference("restaurant_id", Restaurants)
    val type         = text("type")
    val amount       = decimal("amount", 10, 2)
    val reason       = text("reason")
    val authorizedBy = reference("authorized_by", Users)
    val createdAt    = timestamp("created_at")
}

object ReceiptSequences : org.jetbrains.exposed.sql.Table("receipt_sequences") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val seqDate      = org.jetbrains.exposed.sql.javatime.date("seq_date")
    val lastSeq      = integer("last_seq").default(0)
    override val primaryKey = PrimaryKey(restaurantId, seqDate)
}
