package com.culinaryos.backend.domain.ordering

import com.culinaryos.backend.domain.pos.MenuCategories
import com.culinaryos.backend.domain.pos.MenuItems
import com.culinaryos.backend.domain.pos.ModifierGroups
import com.culinaryos.backend.domain.pos.Modifiers
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.util.UUID

class MenuSnapshotService {

    /**
     * Builds and publishes a new MenuSnapshot for the restaurant.
     * Any existing ACTIVE snapshot is atomically archived.
     * The new snapshot is built as a denormalized JSONB tree:
     *   { categories: [{ id, name, items: [{ id, name, priceCents, modifierGroups: [...] }] }] }
     * This means online order reads NEVER need to JOIN — just deserialize one JSONB blob.
     */
    fun publishSnapshot(restaurantId: UUID, publishedBy: UUID): MenuSnapshot = transaction {
        val now = Instant.now()

        // 1. Archive the current ACTIVE snapshot if one exists
        MenuSnapshots.update({
            (MenuSnapshots.restaurantId eq restaurantId) and
            (MenuSnapshots.status eq SnapshotStatus.ACTIVE.name)
        }) {
            it[status] = SnapshotStatus.ARCHIVED.name
        }

        // 2. Build denormalized snapshot JSON from live menu tables
        val snapshotJson = buildSnapshotJson(restaurantId)

        // 3. Get next version number
        val maxVersion = MenuSnapshots
            .select(MenuSnapshots.version.max())
            .where { MenuSnapshots.restaurantId eq restaurantId }
            .singleOrNull()?.get(MenuSnapshots.version.max()) ?: 0

        // 4. Insert new ACTIVE snapshot
        val id = MenuSnapshots.insertAndGetId {
            it[MenuSnapshots.restaurantId] = restaurantId
            it[MenuSnapshots.version]      = maxVersion + 1
            it[MenuSnapshots.status]       = SnapshotStatus.ACTIVE.name
            it[MenuSnapshots.publishedBy]  = publishedBy
            it[MenuSnapshots.publishedAt]  = now
            it[MenuSnapshots.snapshotJson] = snapshotJson
            it[MenuSnapshots.createdAt]    = now
        }.value

        MenuSnapshot(
            id            = id,
            restaurantId  = restaurantId,
            version       = maxVersion + 1,
            status        = SnapshotStatus.ACTIVE,
            publishedBy   = publishedBy,
            publishedAt   = now,
            snapshotJson  = snapshotJson
        )
    }

    /** Returns the current ACTIVE snapshot for a restaurant, or null if none published. */
    fun getActiveSnapshot(restaurantId: UUID): MenuSnapshot? = transaction {
        MenuSnapshots.selectAll()
            .where {
                (MenuSnapshots.restaurantId eq restaurantId) and
                (MenuSnapshots.status eq SnapshotStatus.ACTIVE.name)
            }
            .singleOrNull()
            ?.toSnapshot()
    }

    /** Returns a specific snapshot by ID — used for version validation on order placement. */
    fun getSnapshot(snapshotId: UUID, restaurantId: UUID): MenuSnapshot? = transaction {
        MenuSnapshots.selectAll()
            .where {
                (MenuSnapshots.id eq snapshotId) and
                (MenuSnapshots.restaurantId eq restaurantId)
            }
            .singleOrNull()
            ?.toSnapshot()
    }

    // ─── Snapshot builder ────────────────────────────────────────────────────
    // Walks the live menu tables and produces a self-contained JSON tree.
    // Called inside a transaction so the snapshot is a consistent point-in-time read.

    private fun buildSnapshotJson(restaurantId: UUID): String {
        val categories = MenuCategories.selectAll()
            .where { MenuCategories.restaurantId eq restaurantId }
            .orderBy(MenuCategories.sortOrder)

        val categoriesArray = buildJsonArray {
            categories.forEach { cat ->
                val catId = cat[MenuCategories.id].value

                val items = MenuItems.selectAll()
                    .where {
                        (MenuItems.restaurantId eq restaurantId) and
                        (MenuItems.categoryId eq catId) and
                        (MenuItems.isAvailable eq true)
                    }
                    .orderBy(MenuItems.sortOrder)

                val itemsArray = buildJsonArray {
                    items.forEach { item ->
                        val itemId = item[MenuItems.id].value

                        val modGroups = ModifierGroups.selectAll()
                            .where { ModifierGroups.menuItemId eq itemId }

                        val modGroupsArray = buildJsonArray {
                            modGroups.forEach { group ->
                                val groupId = group[ModifierGroups.id].value
                                val mods = Modifiers.selectAll()
                                    .where { Modifiers.groupId eq groupId }
                                add(buildJsonObject {
                                    put("id", groupId.toString())
                                    put("name", group[ModifierGroups.name])
                                    put("required", group[ModifierGroups.required])
                                    put("minSelections", group[ModifierGroups.minSelections])
                                    put("maxSelections", group[ModifierGroups.maxSelections])
                                    put("modifiers", buildJsonArray {
                                        mods.forEach { mod ->
                                            add(buildJsonObject {
                                                put("id", mod[Modifiers.id].value.toString())
                                                put("name", mod[Modifiers.name])
                                                put("priceCents", mod[Modifiers.priceCents])
                                            })
                                        }
                                    })
                                })
                            }
                        }

                        add(buildJsonObject {
                            put("id", itemId.toString())
                            put("name", item[MenuItems.name])
                            put("description", item[MenuItems.description])
                            put("priceCents", item[MenuItems.priceCents])
                            put("stationTags", buildJsonArray {
                                (item[MenuItems.stationTags] as? List<*>)?.forEach { tag ->
                                    add(tag.toString())
                                }
                            })
                            put("modifierGroups", modGroupsArray)
                        })
                    }
                }

                add(buildJsonObject {
                    put("id", catId.toString())
                    put("name", cat[MenuCategories.name])
                    put("sortOrder", cat[MenuCategories.sortOrder])
                    put("items", itemsArray)
                })
            }
        }

        return Json.encodeToString(categoriesArray)
    }

    private fun ResultRow.toSnapshot() = MenuSnapshot(
        id           = this[MenuSnapshots.id].value,
        restaurantId = this[MenuSnapshots.restaurantId].value,
        version      = this[MenuSnapshots.version],
        status       = SnapshotStatus.valueOf(this[MenuSnapshots.status]),
        publishedBy  = this[MenuSnapshots.publishedBy]?.value,
        publishedAt  = this[MenuSnapshots.publishedAt],
        snapshotJson = this[MenuSnapshots.snapshotJson]
    )
}
