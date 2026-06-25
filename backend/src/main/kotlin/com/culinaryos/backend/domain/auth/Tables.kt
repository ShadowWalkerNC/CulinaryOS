package com.culinaryos.backend.domain.auth

import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.timestamp

object Organizations : UUIDTable("organizations") {
    val name      = text("name")
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
}

object Restaurants : UUIDTable("restaurants") {
    val organizationId = reference("organization_id", Organizations)
    val name           = text("name")
    val timezone       = text("timezone").default("America/New_York")
    val address        = text("address").nullable()
    val phone          = text("phone").nullable()
    val createdAt      = timestamp("created_at")
    val updatedAt      = timestamp("updated_at")
}

object Users : UUIDTable("users") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val email        = text("email")
    val passwordHash = text("password_hash")
    val name         = text("name")
    val role         = text("role")
    val isActive     = bool("is_active").default(true)
    val createdAt    = timestamp("created_at")
    val updatedAt    = timestamp("updated_at")
}

object RefreshTokens : UUIDTable("refresh_tokens") {
    val userId    = reference("user_id", Users)
    val tokenHash = text("token_hash")
    val expiresAt = timestamp("expires_at")
    val usedAt    = timestamp("used_at").nullable()
    val createdAt = timestamp("created_at")
}
