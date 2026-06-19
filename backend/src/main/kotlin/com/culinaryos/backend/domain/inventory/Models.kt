package com.culinaryos.backend.domain.inventory

import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

// ─── Domain Models ────────────────────────────────────────────────────────────

data class StorageLocation(
    val id: UUID,
    val restaurantId: UUID,
    val name: String
)

data class InventoryItem(
    val id: UUID,
    val restaurantId: UUID,
    val storageLocationId: UUID?,
    val name: String,
    val unit: String,
    val currentQuantity: BigDecimal,
    val parLevel: BigDecimal,
    val reorderQuantity: BigDecimal,
    val costPerUnitCents: Int,
    val isActive: Boolean,
    val isBelowPar: Boolean   // derived: currentQuantity <= parLevel
)

data class MenuItemIngredient(
    val id: UUID,
    val restaurantId: UUID,
    val menuItemId: UUID,
    val inventoryItemId: UUID,
    val quantityUsed: BigDecimal
)

data class DepletionEvent(
    val id: UUID,
    val restaurantId: UUID,
    val inventoryItemId: UUID,
    val source: DepletionSource,
    val quantityDelta: BigDecimal,
    val orderId: UUID?,
    val orderLineId: UUID?,
    val actorId: UUID?,
    val notes: String?,
    val occurredAt: Instant
)

enum class DepletionSource { SALE, WASTE, ADJUSTMENT, PURCHASE_RECEIVED }

data class ReorderRule(
    val id: UUID,
    val restaurantId: UUID,
    val inventoryItemId: UUID,
    val vendorName: String?,
    val vendorContact: String?,
    val autoDraft: Boolean
)

data class PurchaseOrder(
    val id: UUID,
    val restaurantId: UUID,
    val status: PurchaseOrderStatus,
    val vendorName: String?,
    val linesJson: String,
    val totalCostCents: Int,
    val notes: String?,
    val createdBy: UUID?,
    val submittedAt: Instant?,
    val receivedAt: Instant?,
    val createdAt: Instant
)

enum class PurchaseOrderStatus { DRAFT, SUBMITTED, RECEIVED, CANCELLED }

// ─── Request DTOs ─────────────────────────────────────────────────────────────

@Serializable
data class CreateInventoryItemRequest(
    val name: String,
    val unit: String = "each",
    val parLevel: Double = 0.0,
    val reorderQuantity: Double = 0.0,
    val costPerUnitCents: Int = 0,
    val storageLocationId: String? = null
)

@Serializable
data class LinkIngredientRequest(
    val menuItemId: String,
    val inventoryItemId: String,
    val quantityUsed: Double
)

@Serializable
data class ManualAdjustmentRequest(
    val inventoryItemId: String,
    val quantityDelta: Double,
    val source: String,   // WASTE | ADJUSTMENT
    val notes: String? = null,
    val actorId: String? = null
)

@Serializable
data class CreatePurchaseOrderRequest(
    val vendorName: String? = null,
    val lines: List<PurchaseOrderLineRequest>,
    val notes: String? = null,
    val createdBy: String? = null
)

@Serializable
data class PurchaseOrderLineRequest(
    val inventoryItemId: String,
    val inventoryItemName: String,
    val quantity: Double,
    val unitCostCents: Int
)

@Serializable
data class SetReorderRuleRequest(
    val inventoryItemId: String,
    val vendorName: String? = null,
    val vendorContact: String? = null,
    val autoDraft: Boolean = false
)
