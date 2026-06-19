package com.culinaryos.backend.domain.pos

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.util.UUID

class MenuRepository {

    fun createCategory(restaurantId: UUID, name: String, sortOrder: Int = 0): MenuCategory = transaction {
        val now = Instant.now()
        val id = MenuCategories.insertAndGetId {
            it[MenuCategories.restaurantId] = restaurantId
            it[MenuCategories.name]         = name
            it[MenuCategories.sortOrder]    = sortOrder
            it[MenuCategories.createdAt]    = now
            it[MenuCategories.updatedAt]    = now
        }.value
        MenuCategory(id, restaurantId, name, sortOrder, true)
    }

    fun listCategories(restaurantId: UUID): List<MenuCategory> = transaction {
        MenuCategories.selectAll()
            .where { (MenuCategories.restaurantId eq restaurantId) and (MenuCategories.isActive eq true) }
            .orderBy(MenuCategories.sortOrder)
            .map { it.toCategory() }
    }

    fun createMenuItem(restaurantId: UUID, req: CreateMenuItemRequest): MenuItem = transaction {
        val now = Instant.now()
        val id = MenuItems.insertAndGetId {
            it[MenuItems.restaurantId] = restaurantId
            it[MenuItems.categoryId]   = req.categoryId?.let { cid -> UUID.fromString(cid) }
            it[MenuItems.name]         = req.name
            it[MenuItems.description]  = req.description
            it[MenuItems.price]        = java.math.BigDecimal.valueOf(req.price)
            it[MenuItems.stationTags]  = req.stationTags
            it[MenuItems.sortOrder]    = req.sortOrder
            it[MenuItems.createdAt]    = now
            it[MenuItems.updatedAt]    = now
        }.value
        MenuItem(id, restaurantId, req.categoryId?.let { UUID.fromString(it) },
            req.name, req.description, java.math.BigDecimal.valueOf(req.price),
            req.stationTags, true, req.sortOrder)
    }

    fun listMenuItems(restaurantId: UUID): List<MenuItem> = transaction {
        MenuItems.selectAll()
            .where { (MenuItems.restaurantId eq restaurantId) and (MenuItems.isActive eq true) }
            .orderBy(MenuItems.sortOrder)
            .map { it.toItem() }
    }

    fun findMenuItemById(id: UUID, restaurantId: UUID): MenuItem? = transaction {
        MenuItems.selectAll()
            .where { (MenuItems.id eq id) and (MenuItems.restaurantId eq restaurantId) }
            .singleOrNull()
            ?.toItem()
    }

    private fun ResultRow.toCategory() = MenuCategory(
        id           = this[MenuCategories.id].value,
        restaurantId = this[MenuCategories.restaurantId].value,
        name         = this[MenuCategories.name],
        sortOrder    = this[MenuCategories.sortOrder],
        isActive     = this[MenuCategories.isActive]
    )

    private fun ResultRow.toItem() = MenuItem(
        id           = this[MenuItems.id].value,
        restaurantId = this[MenuItems.restaurantId].value,
        categoryId   = this[MenuItems.categoryId]?.value,
        name         = this[MenuItems.name],
        description  = this[MenuItems.description],
        price        = this[MenuItems.price],
        stationTags  = this[MenuItems.stationTags],
        isActive     = this[MenuItems.isActive],
        sortOrder    = this[MenuItems.sortOrder]
    )
}
