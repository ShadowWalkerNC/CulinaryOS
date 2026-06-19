package com.culinaryos.backend.domain.pos

import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

// ─── Menu ─────────────────────────────────────────────────────────────────────

data class MenuCategory(
    val id: UUID,
    val restaurantId: UUID,
    val name: String,
    val sortOrder: Int,
    val isActive: Boolean
)

data class MenuItem(
    val id: UUID,
    val restaurantId: UUID,
    val categoryId: UUID?,
    val name: String,
    val description: String?,
    val price: BigDecimal,
    val stationTags: List<String>,
    val isActive: Boolean,
    val sortOrder: Int
)

data class ModifierGroup(
    val id: UUID,
    val restaurantId: UUID,
    val name: String,
    val minSelect: Int,
    val maxSelect: Int,
    val isRequired: Boolean,
    val modifiers: List<Modifier> = emptyList()
)

data class Modifier(
    val id: UUID,
    val modifierGroupId: UUID,
    val restaurantId: UUID,
    val name: String,
    val priceDelta: BigDecimal,
    val isActive: Boolean,
    val sortOrder: Int
)

// ─── Tables ────────────────────────────────────────────────────────────────────

data class Section(
    val id: UUID,
    val restaurantId: UUID,
    val name: String,
    val sortOrder: Int
)

data class DiningTable(
    val id: UUID,
    val restaurantId: UUID,
    val sectionId: UUID?,
    val name: String,
    val capacity: Int,
    val status: TableStatus
)

enum class TableStatus { AVAILABLE, OCCUPIED, RESERVED, CLEANING }

// ─── Orders ────────────────────────────────────────────────────────────────────

data class Order(
    val id: UUID,
    val restaurantId: UUID,
    val tableId: UUID?,
    val openedBy: UUID,
    val status: OrderStatus,
    val source: OrderSource,
    val receiptNumber: String?,
    val coverCount: Int,
    val notes: String?,
    val lines: List<OrderLine> = emptyList(),
    val adjustments: List<OrderAdjustment> = emptyList(),
    val createdAt: Instant
)

enum class OrderStatus { OPEN, SENT, PARTIALLY_PAID, PAID, VOIDED }
enum class OrderSource { POS, ONLINE, KIOSK }

data class OrderLine(
    val id: UUID,
    val orderId: UUID,
    val restaurantId: UUID,
    val menuItemId: UUID,
    val menuItemName: String,
    val unitPrice: BigDecimal,
    val quantity: Int,
    val stationTags: List<String>,
    val modifiersJson: String,
    val lineTotal: BigDecimal,
    val status: LineStatus,
    val voidReason: String?,
    val voidedBy: UUID?,
    val voidedAt: Instant?,
    val createdAt: Instant
)

enum class LineStatus { PENDING, SENT, COMPLETED, VOIDED }

data class OrderAdjustment(
    val id: UUID,
    val orderId: UUID,
    val restaurantId: UUID,
    val type: AdjustmentType,
    val amount: BigDecimal,
    val reason: String,
    val authorizedBy: UUID,
    val createdAt: Instant
)

enum class AdjustmentType { DISCOUNT, COMP, SURCHARGE }

// ─── Request DTOs ──────────────────────────────────────────────────────────────

@Serializable
data class CreateMenuItemRequest(
    val categoryId: String? = null,
    val name: String,
    val description: String? = null,
    val price: Double,
    val stationTags: List<String> = emptyList(),
    val sortOrder: Int = 0
)

@Serializable
data class CreateSectionRequest(val name: String, val sortOrder: Int = 0)

@Serializable
data class CreateTableRequest(
    val sectionId: String? = null,
    val name: String,
    val capacity: Int = 2
)

@Serializable
data class CreateOrderRequest(
    val tableId: String? = null,
    val coverCount: Int = 1,
    val notes: String? = null,
    val lines: List<OrderLineRequest>
)

@Serializable
data class OrderLineRequest(
    val menuItemId: String,
    val quantity: Int = 1,
    val modifiers: List<ModifierRequest> = emptyList()
)

@Serializable
data class ModifierRequest(
    val name: String,
    val priceDelta: Double = 0.0
)

@Serializable
data class VoidLineRequest(
    val reason: String
)

@Serializable
data class AddAdjustmentRequest(
    val type: String,
    val amount: Double,
    val reason: String
)
