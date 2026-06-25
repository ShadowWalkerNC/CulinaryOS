package com.culinaryos.backend.domain.auth

import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.UUID

// ─── Domain Models ────────────────────────────────────────────────────────────

data class Organization(
    val id: UUID,
    val name: String,
    val createdAt: Instant
)

data class Restaurant(
    val id: UUID,
    val organizationId: UUID,
    val name: String,
    val timezone: String,   // IANA identifier — e.g. "America/New_York"
    val address: String?,
    val phone: String?,
    val createdAt: Instant
)

data class User(
    val id: UUID,
    val restaurantId: UUID,
    val email: String,
    val passwordHash: String,
    val name: String,
    val role: Role,
    val isActive: Boolean,
    val createdAt: Instant
)

enum class Role {
    owner, manager, server, cook, cashier;

    /** Returns true if this role has access to routes requiring [required] role. */
    fun canAccess(required: Role): Boolean = when (required) {
        owner    -> this == owner
        manager  -> this == owner || this == manager
        server   -> this in setOf(owner, manager, server)
        cashier  -> this in setOf(owner, manager, cashier)
        cook     -> this in setOf(owner, manager, cook)
    }
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

@Serializable
data class RegisterRequest(
    val orgName: String,
    val restaurantName: String,
    val timezone: String = "America/New_York",
    val email: String,
    val password: String,
    val name: String
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class RefreshRequest(
    val refreshToken: String
)

@Serializable
data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: UserProfile
)

@Serializable
data class UserProfile(
    val id: String,
    val email: String,
    val name: String,
    val role: String,
    val restaurantId: String,
    val organizationId: String
)
