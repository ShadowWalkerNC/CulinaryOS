package com.culinaryos.backend.domain.auth

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.util.UUID

class AuthRepository {

    // ─── Register ─────────────────────────────────────────────────────────────

    fun createOrgRestaurantAndOwner(
        orgName: String,
        restaurantName: String,
        timezone: String,
        email: String,
        passwordHash: String,
        name: String
    ): Triple<Organization, Restaurant, User> = transaction {
        val now = Instant.now()

        val orgId = Organizations.insertAndGetId {
            it[Organizations.name]      = orgName
            it[Organizations.createdAt] = now
            it[Organizations.updatedAt] = now
        }.value

        val restaurantId = Restaurants.insertAndGetId {
            it[Restaurants.organizationId] = orgId
            it[Restaurants.name]           = restaurantName
            it[Restaurants.timezone]       = timezone
            it[Restaurants.createdAt]      = now
            it[Restaurants.updatedAt]      = now
        }.value

        val userId = Users.insertAndGetId {
            it[Users.restaurantId] = restaurantId
            it[Users.email]        = email
            it[Users.passwordHash] = passwordHash
            it[Users.name]         = name
            it[Users.role]         = Role.owner.name
            it[Users.isActive]     = true
            it[Users.createdAt]    = now
            it[Users.updatedAt]    = now
        }.value

        Triple(
            Organization(orgId, orgName, now),
            Restaurant(restaurantId, orgId, restaurantName, timezone, null, null, now),
            User(userId, restaurantId, email, passwordHash, name, Role.owner, true, now)
        )
    }

    // ─── Lookups ───────────────────────────────────────────────────────────────

    fun findUserByEmail(email: String): User? = transaction {
        Users.selectAll()
            .where { Users.email eq email }
            .singleOrNull()
            ?.toUser()
    }

    fun findUserById(id: UUID): User? = transaction {
        Users.selectAll()
            .where { Users.id eq id }
            .singleOrNull()
            ?.toUser()
    }

    fun findRestaurantById(id: UUID): Restaurant? = transaction {
        Restaurants.selectAll()
            .where { Restaurants.id eq id }
            .singleOrNull()
            ?.toRestaurant()
    }

    fun emailExists(email: String): Boolean = transaction {
        Users.selectAll().where { Users.email eq email }.count() > 0
    }

    // ─── Refresh Tokens ────────────────────────────────────────────────────────

    fun saveRefreshToken(userId: UUID, tokenHash: String, expiresAt: Instant) = transaction {
        val now = Instant.now()
        RefreshTokens.insert {
            it[RefreshTokens.userId]    = userId
            it[RefreshTokens.tokenHash] = tokenHash
            it[RefreshTokens.expiresAt] = expiresAt
            it[RefreshTokens.createdAt] = now
        }
    }

    fun findAndConsumeRefreshToken(tokenHash: String): UUID? = transaction {
        val row = RefreshTokens.selectAll()
            .where {
                (RefreshTokens.tokenHash eq tokenHash) and
                (RefreshTokens.usedAt.isNull()) and
                (RefreshTokens.expiresAt greater Instant.now())
            }
            .singleOrNull() ?: return@transaction null

        // Mark used immediately — single-use enforcement
        RefreshTokens.update({ RefreshTokens.id eq row[RefreshTokens.id] }) {
            it[usedAt] = Instant.now()
        }

        row[RefreshTokens.userId].value
    }

    // ─── Row Mappers ───────────────────────────────────────────────────────────

    private fun ResultRow.toUser() = User(
        id           = this[Users.id].value,
        restaurantId = this[Users.restaurantId].value,
        email        = this[Users.email],
        passwordHash = this[Users.passwordHash],
        name         = this[Users.name],
        role         = Role.valueOf(this[Users.role]),
        isActive     = this[Users.isActive],
        createdAt    = this[Users.createdAt]
    )

    private fun ResultRow.toRestaurant() = Restaurant(
        id             = this[Restaurants.id].value,
        organizationId = this[Restaurants.organizationId].value,
        name           = this[Restaurants.name],
        timezone       = this[Restaurants.timezone],
        address        = this[Restaurants.address],
        phone          = this[Restaurants.phone],
        createdAt      = this[Restaurants.createdAt]
    )
}
