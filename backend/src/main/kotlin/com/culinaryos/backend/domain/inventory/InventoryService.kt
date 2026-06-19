package com.culinaryos.backend.domain.inventory

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class InventoryService {

    // ─── Storage Locations ────────────────────────────────────────────────────

    fun createStorageLocation(restaurantId: UUID, name: String): StorageLocation = transaction {
        val id = StorageLocations.insertAndGetId {
            it[StorageLocations.restaurantId] = restaurantId
            it[StorageLocations.name]         = name
            it[StorageLocations.createdAt]    = Instant.now()
        }.value
        StorageLocation(id, restaurantId, name)
    }

    fun listStorageLocations(restaurantId: UUID): List<StorageLocation> = transaction {
        StorageLocations.selectAll()
            .where { StorageLocations.restaurantId eq restaurantId }
            .map { StorageLocation(it[StorageLocations.id].value, restaurantId, it[StorageLocations.name]) }
    }

    // ─── Inventory Items ──────────────────────────────────────────────────────

    fun createItem(restaurantId: UUID, req: CreateInventoryItemRequest): InventoryItem = transaction {
        val now = Instant.now()
        val id = InventoryItems.insertAndGetId {
            it[InventoryItems.restaurantId]      = restaurantId
            it[InventoryItems.storageLocationId] = req.storageLocationId?.let { UUID.fromString(it) }
            it[InventoryItems.name]              = req.name
            it[InventoryItems.unit]              = req.unit
            it[InventoryItems.parLevel]          = BigDecimal.valueOf(req.parLevel)
            it[InventoryItems.reorderQuantity]   = BigDecimal.valueOf(req.reorderQuantity)
            it[InventoryItems.costPerUnitCents]  = req.costPerUnitCents
            it[InventoryItems.createdAt]         = now
            it[InventoryItems.updatedAt]         = now
        }.value
        InventoryItem(
            id = id, restaurantId = restaurantId,
            storageLocationId = req.storageLocationId?.let { UUID.fromString(it) },
            name = req.name, unit = req.unit,
            currentQuantity = BigDecimal.ZERO,
            parLevel = BigDecimal.valueOf(req.parLevel),
            reorderQuantity = BigDecimal.valueOf(req.reorderQuantity),
            costPerUnitCents = req.costPerUnitCents,
            isActive = true, isBelowPar = req.parLevel > 0.0
        )
    }

    fun listItems(restaurantId: UUID): List<InventoryItem> = transaction {
        InventoryItems.selectAll()
            .where { (InventoryItems.restaurantId eq restaurantId) and (InventoryItems.isActive eq true) }
            .map { it.toItem() }
    }

    fun getItemsBelowPar(restaurantId: UUID): List<InventoryItem> = transaction {
        InventoryItems.selectAll()
            .where {
                (InventoryItems.restaurantId eq restaurantId) and
                (InventoryItems.isActive eq true) and
                (InventoryItems.currentQuantity lessEq InventoryItems.parLevel)
            }
            .map { it.toItem() }
    }

    // ─── Recipe Links ─────────────────────────────────────────────────────────

    fun linkIngredient(restaurantId: UUID, req: LinkIngredientRequest): MenuItemIngredient = transaction {
        val id = MenuItemIngredients.insertAndGetId {
            it[MenuItemIngredients.restaurantId]    = restaurantId
            it[MenuItemIngredients.menuItemId]      = UUID.fromString(req.menuItemId)
            it[MenuItemIngredients.inventoryItemId] = UUID.fromString(req.inventoryItemId)
            it[MenuItemIngredients.quantityUsed]    = BigDecimal.valueOf(req.quantityUsed)
        }.value
        MenuItemIngredient(
            id = id, restaurantId = restaurantId,
            menuItemId      = UUID.fromString(req.menuItemId),
            inventoryItemId = UUID.fromString(req.inventoryItemId),
            quantityUsed    = BigDecimal.valueOf(req.quantityUsed)
        )
    }

    // ─── Depletion Engine ─────────────────────────────────────────────────────
    // Called by OrderService when an order line is committed (source: SALE).
    // Also called directly for WASTE and ADJUSTMENT events.
    //
    // For each order line:
    //   1. Look up recipe links for the menu item
    //   2. For each ingredient: delta = -(quantityUsed × lineQuantity)
    //   3. Write DepletionEvent
    //   4. Update current_quantity on InventoryItem
    //   5. If current_quantity <= par_level: check ReorderRule → auto-draft PO if configured

    fun depleteForOrderLine(
        restaurantId: UUID,
        orderId: UUID,
        orderLineId: UUID,
        menuItemId: UUID,
        lineQuantity: Int
    ): List<DepletionEvent> = transaction {
        val ingredients = MenuItemIngredients.selectAll()
            .where {
                (MenuItemIngredients.menuItemId   eq menuItemId) and
                (MenuItemIngredients.restaurantId eq restaurantId)
            }

        ingredients.map { ingredient ->
            val invItemId = ingredient[MenuItemIngredients.inventoryItemId].value
            val qtyUsed   = ingredient[MenuItemIngredients.quantityUsed]
            val delta     = qtyUsed.multiply(BigDecimal.valueOf(lineQuantity.toLong())).negate()

            // Append depletion event
            val eventId = DepletionEvents.insertAndGetId {
                it[DepletionEvents.restaurantId]      = restaurantId
                it[DepletionEvents.inventoryItemId]   = invItemId
                it[DepletionEvents.source]            = DepletionSource.SALE.name
                it[DepletionEvents.quantityDelta]     = delta
                it[DepletionEvents.orderId]           = orderId
                it[DepletionEvents.orderLineId]       = orderLineId
                it[DepletionEvents.occurredAt]        = Instant.now()
            }.value

            // Update current_quantity
            InventoryItems.update({ InventoryItems.id eq invItemId }) {
                with(SqlExpressionBuilder) {
                    it.update(currentQuantity, currentQuantity + delta)
                }
                it[updatedAt] = Instant.now()
            }

            // Check par — trigger reorder if breached
            checkAndTriggerReorder(restaurantId, invItemId)

            DepletionEvent(
                id = eventId, restaurantId = restaurantId,
                inventoryItemId = invItemId,
                source          = DepletionSource.SALE,
                quantityDelta   = delta,
                orderId         = orderId,
                orderLineId     = orderLineId,
                actorId         = null, notes = null,
                occurredAt      = Instant.now()
            )
        }
    }

    fun manualAdjustment(restaurantId: UUID, req: ManualAdjustmentRequest): DepletionEvent = transaction {
        val invItemId = UUID.fromString(req.inventoryItemId)
        val delta     = BigDecimal.valueOf(req.quantityDelta)
        val source    = DepletionSource.valueOf(req.source.uppercase())

        val eventId = DepletionEvents.insertAndGetId {
            it[DepletionEvents.restaurantId]    = restaurantId
            it[DepletionEvents.inventoryItemId] = invItemId
            it[DepletionEvents.source]          = source.name
            it[DepletionEvents.quantityDelta]   = delta
            it[DepletionEvents.actorId]         = req.actorId?.let { UUID.fromString(it) }
            it[DepletionEvents.notes]           = req.notes
            it[DepletionEvents.occurredAt]      = Instant.now()
        }.value

        InventoryItems.update({ InventoryItems.id eq invItemId }) {
            with(SqlExpressionBuilder) {
                it.update(currentQuantity, currentQuantity + delta)
            }
            it[updatedAt] = Instant.now()
        }

        if (delta < BigDecimal.ZERO) checkAndTriggerReorder(restaurantId, invItemId)

        DepletionEvent(
            id = eventId, restaurantId = restaurantId,
            inventoryItemId = invItemId, source = source,
            quantityDelta = delta, orderId = null, orderLineId = null,
            actorId = req.actorId?.let { UUID.fromString(it) },
            notes = req.notes, occurredAt = Instant.now()
        )
    }

    fun listDepletionEvents(restaurantId: UUID, inventoryItemId: UUID? = null): List<DepletionEvent> = transaction {
        val query = DepletionEvents.selectAll()
            .where { DepletionEvents.restaurantId eq restaurantId }
        inventoryItemId?.let { query.andWhere { DepletionEvents.inventoryItemId eq it } }
        query.orderBy(DepletionEvents.occurredAt, SortOrder.DESC).map { it.toEvent() }
    }

    // ─── Reorder Rules ────────────────────────────────────────────────────────

    fun setReorderRule(restaurantId: UUID, req: SetReorderRuleRequest): ReorderRule = transaction {
        val invItemId = UUID.fromString(req.inventoryItemId)
        // Upsert — one rule per inventory item
        ReorderRules.deleteWhere {
            (ReorderRules.restaurantId eq restaurantId) and
            (ReorderRules.inventoryItemId eq invItemId)
        }
        val id = ReorderRules.insertAndGetId {
            it[ReorderRules.restaurantId]    = restaurantId
            it[ReorderRules.inventoryItemId] = invItemId
            it[ReorderRules.vendorName]      = req.vendorName
            it[ReorderRules.vendorContact]   = req.vendorContact
            it[ReorderRules.autoDraft]       = req.autoDraft
            it[ReorderRules.createdAt]       = Instant.now()
        }.value
        ReorderRule(id, restaurantId, invItemId, req.vendorName, req.vendorContact, req.autoDraft)
    }

    // ─── Purchase Orders ──────────────────────────────────────────────────────

    fun createPurchaseOrder(restaurantId: UUID, req: CreatePurchaseOrderRequest): PurchaseOrder = transaction {
        val now = Instant.now()
        val totalCents = req.lines.sumOf { (it.quantity * it.unitCostCents).toInt() }
        val linesJson  = buildPoLinesJson(req.lines)
        val id = PurchaseOrders.insertAndGetId {
            it[PurchaseOrders.restaurantId]   = restaurantId
            it[PurchaseOrders.vendorName]     = req.vendorName
            it[PurchaseOrders.linesJson]      = linesJson
            it[PurchaseOrders.totalCostCents] = totalCents
            it[PurchaseOrders.notes]          = req.notes
            it[PurchaseOrders.createdBy]      = req.createdBy?.let { UUID.fromString(it) }
            it[PurchaseOrders.createdAt]      = now
            it[PurchaseOrders.updatedAt]      = now
        }.value
        PurchaseOrder(
            id = id, restaurantId = restaurantId,
            status = PurchaseOrderStatus.DRAFT,
            vendorName = req.vendorName, linesJson = linesJson,
            totalCostCents = totalCents, notes = req.notes,
            createdBy = req.createdBy?.let { UUID.fromString(it) },
            submittedAt = null, receivedAt = null, createdAt = now
        )
    }

    /**
     * Receives a purchase order.
     * For each line in lines_json, creates a PURCHASE_RECEIVED depletion event
     * (positive delta) and increments current_quantity on the inventory item.
     */
    fun receivePurchaseOrder(poId: UUID, restaurantId: UUID): PurchaseOrder = transaction {
        val now = Instant.now()
        val po = PurchaseOrders.selectAll()
            .where {
                (PurchaseOrders.id eq poId) and
                (PurchaseOrders.restaurantId eq restaurantId)
            }
            .singleOrNull() ?: throw NoSuchElementException("Purchase order not found")

        if (po[PurchaseOrders.status] != PurchaseOrderStatus.SUBMITTED.name) {
            throw IllegalStateException("Only SUBMITTED purchase orders can be received")
        }

        // Parse lines_json and increment stock for each line
        val linesJson = po[PurchaseOrders.linesJson]
        // Simple JSON parsing — lines format: [{"inventoryItemId":"...","quantity":N,...}]
        val itemQtyPairs = parsePoLines(linesJson)
        itemQtyPairs.forEach { (invItemId, qty) ->
            DepletionEvents.insert {
                it[DepletionEvents.restaurantId]    = restaurantId
                it[DepletionEvents.inventoryItemId] = invItemId
                it[DepletionEvents.source]          = DepletionSource.PURCHASE_RECEIVED.name
                it[DepletionEvents.quantityDelta]   = qty  // positive = stock in
                it[DepletionEvents.occurredAt]      = now
            }
            InventoryItems.update({ InventoryItems.id eq invItemId }) {
                with(SqlExpressionBuilder) {
                    it.update(currentQuantity, currentQuantity + qty)
                }
                it[updatedAt] = now
            }
        }

        PurchaseOrders.update({
            (PurchaseOrders.id eq poId) and (PurchaseOrders.restaurantId eq restaurantId)
        }) {
            it[status]     = PurchaseOrderStatus.RECEIVED.name
            it[receivedAt] = now
            it[updatedAt]  = now
        }

        po.toPo().copy(status = PurchaseOrderStatus.RECEIVED, receivedAt = now)
    }

    fun listPurchaseOrders(restaurantId: UUID, statusFilter: PurchaseOrderStatus? = null): List<PurchaseOrder> = transaction {
        val q = PurchaseOrders.selectAll().where { PurchaseOrders.restaurantId eq restaurantId }
        statusFilter?.let { q.andWhere { PurchaseOrders.status eq it.name } }
        q.orderBy(PurchaseOrders.createdAt, SortOrder.DESC).map { it.toPo() }
    }

    // ─── Par alert check + auto-draft ─────────────────────────────────────────
    // Called after every depletion. If stock hits or crosses par, checks whether
    // an auto-draft reorder rule exists and creates a DRAFT PO if so.
    // In Phase 9, this also triggers a push notification to the manager app.

    private fun checkAndTriggerReorder(restaurantId: UUID, invItemId: UUID) {
        val item = InventoryItems.selectAll()
            .where { InventoryItems.id eq invItemId }
            .singleOrNull() ?: return

        val current = item[InventoryItems.currentQuantity]
        val par     = item[InventoryItems.parLevel]
        if (current > par) return  // still above par, nothing to do

        val rule = ReorderRules.selectAll()
            .where {
                (ReorderRules.restaurantId eq restaurantId) and
                (ReorderRules.inventoryItemId eq invItemId)
            }
            .singleOrNull() ?: return  // no rule configured

        if (!rule[ReorderRules.autoDraft]) return  // rule exists but auto-draft disabled

        // Check if a DRAFT PO already exists for this item to avoid duplicates
        val existingDraft = PurchaseOrders.selectAll()
            .where {
                (PurchaseOrders.restaurantId eq restaurantId) and
                (PurchaseOrders.status eq PurchaseOrderStatus.DRAFT.name) and
                (PurchaseOrders.linesJson like "%${invItemId}%")
            }
            .count()
        if (existingDraft > 0) return  // draft already exists

        val reorderQty = item[InventoryItems.reorderQuantity]
        val costCents  = item[InventoryItems.costPerUnitCents]
        val itemName   = item[InventoryItems.name]
        val now        = Instant.now()

        PurchaseOrders.insert {
            it[PurchaseOrders.restaurantId]   = restaurantId
            it[PurchaseOrders.vendorName]     = rule[ReorderRules.vendorName]
            it[PurchaseOrders.linesJson]      = """[{"inventoryItemId":"$invItemId","inventoryItemName":"$itemName","quantity":$reorderQty,"unitCostCents":$costCents}]"""
            it[PurchaseOrders.totalCostCents] = reorderQty.multiply(BigDecimal.valueOf(costCents.toLong())).toInt()
            it[PurchaseOrders.notes]          = "Auto-drafted: stock at $current ${ item[InventoryItems.unit] } (par: $par)"
            it[PurchaseOrders.createdAt]      = now
            it[PurchaseOrders.updatedAt]      = now
        }
    }

    // ─── Row mappers ──────────────────────────────────────────────────────────

    private fun ResultRow.toItem(): InventoryItem {
        val current = this[InventoryItems.currentQuantity]
        val par     = this[InventoryItems.parLevel]
        return InventoryItem(
            id                = this[InventoryItems.id].value,
            restaurantId      = this[InventoryItems.restaurantId].value,
            storageLocationId = this[InventoryItems.storageLocationId]?.value,
            name              = this[InventoryItems.name],
            unit              = this[InventoryItems.unit],
            currentQuantity   = current,
            parLevel          = par,
            reorderQuantity   = this[InventoryItems.reorderQuantity],
            costPerUnitCents  = this[InventoryItems.costPerUnitCents],
            isActive          = this[InventoryItems.isActive],
            isBelowPar        = current <= par
        )
    }

    private fun ResultRow.toEvent() = DepletionEvent(
        id              = this[DepletionEvents.id].value,
        restaurantId    = this[DepletionEvents.restaurantId].value,
        inventoryItemId = this[DepletionEvents.inventoryItemId].value,
        source          = DepletionSource.valueOf(this[DepletionEvents.source]),
        quantityDelta   = this[DepletionEvents.quantityDelta],
        orderId         = this[DepletionEvents.orderId]?.value,
        orderLineId     = this[DepletionEvents.orderLineId]?.value,
        actorId         = this[DepletionEvents.actorId]?.value,
        notes           = this[DepletionEvents.notes],
        occurredAt      = this[DepletionEvents.occurredAt]
    )

    private fun ResultRow.toPo() = PurchaseOrder(
        id             = this[PurchaseOrders.id].value,
        restaurantId   = this[PurchaseOrders.restaurantId].value,
        status         = PurchaseOrderStatus.valueOf(this[PurchaseOrders.status]),
        vendorName     = this[PurchaseOrders.vendorName],
        linesJson      = this[PurchaseOrders.linesJson],
        totalCostCents = this[PurchaseOrders.totalCostCents],
        notes          = this[PurchaseOrders.notes],
        createdBy      = this[PurchaseOrders.createdBy]?.value,
        submittedAt    = this[PurchaseOrders.submittedAt],
        receivedAt     = this[PurchaseOrders.receivedAt],
        createdAt      = this[PurchaseOrders.createdAt]
    )

    private fun buildPoLinesJson(lines: List<PurchaseOrderLineRequest>): String {
        return lines.joinToString(",", "[", "]") { l ->
            """{"inventoryItemId":"${l.inventoryItemId}","inventoryItemName":"${l.inventoryItemName}","quantity":${l.quantity},"unitCostCents":${l.unitCostCents}}"""
        }
    }

    private fun parsePoLines(json: String): List<Pair<UUID, BigDecimal>> {
        return Regex("""\{[^}]*\"inventoryItemId\":\"([^\"]+)\"[^}]*\"quantity\":([\d.]+)[^}]*\}""").findAll(json)
            .map { Pair(UUID.fromString(it.groupValues[1]), BigDecimal(it.groupValues[2])) }
            .toList()
    }
}
