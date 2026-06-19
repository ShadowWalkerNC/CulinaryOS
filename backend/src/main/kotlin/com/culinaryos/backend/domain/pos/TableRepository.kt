package com.culinaryos.backend.domain.pos

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.util.UUID

class TableRepository {

    fun createSection(restaurantId: UUID, req: CreateSectionRequest): Section = transaction {
        val now = Instant.now()
        val id = Sections.insertAndGetId {
            it[Sections.restaurantId] = restaurantId
            it[Sections.name]         = req.name
            it[Sections.sortOrder]    = req.sortOrder
            it[Sections.createdAt]    = now
        }.value
        Section(id, restaurantId, req.name, req.sortOrder)
    }

    fun listSections(restaurantId: UUID): List<Section> = transaction {
        Sections.selectAll()
            .where { Sections.restaurantId eq restaurantId }
            .orderBy(Sections.sortOrder)
            .map { Section(it[Sections.id].value, restaurantId, it[Sections.name], it[Sections.sortOrder]) }
    }

    fun createTable(restaurantId: UUID, req: CreateTableRequest): DiningTable = transaction {
        val now = Instant.now()
        val id = DiningTables.insertAndGetId {
            it[DiningTables.restaurantId] = restaurantId
            it[DiningTables.sectionId]    = req.sectionId?.let { UUID.fromString(it) }
            it[DiningTables.name]         = req.name
            it[DiningTables.capacity]     = req.capacity
            it[DiningTables.createdAt]    = now
            it[DiningTables.updatedAt]    = now
        }.value
        DiningTable(id, restaurantId, req.sectionId?.let { UUID.fromString(it) },
            req.name, req.capacity, TableStatus.AVAILABLE)
    }

    fun listTables(restaurantId: UUID): List<DiningTable> = transaction {
        DiningTables.selectAll()
            .where { DiningTables.restaurantId eq restaurantId }
            .map { it.toTable() }
    }

    fun findTableById(id: UUID, restaurantId: UUID): DiningTable? = transaction {
        DiningTables.selectAll()
            .where { (DiningTables.id eq id) and (DiningTables.restaurantId eq restaurantId) }
            .singleOrNull()
            ?.toTable()
    }

    private fun ResultRow.toTable() = DiningTable(
        id           = this[DiningTables.id].value,
        restaurantId = this[DiningTables.restaurantId].value,
        sectionId    = this[DiningTables.sectionId]?.value,
        name         = this[DiningTables.name],
        capacity     = this[DiningTables.capacity],
        status       = TableStatus.valueOf(this[DiningTables.status])
    )
}
