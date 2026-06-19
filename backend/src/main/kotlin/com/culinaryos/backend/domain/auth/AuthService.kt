package com.culinaryos.backend.domain.auth

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import org.mindrot.jbcrypt.BCrypt
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Base64
import java.util.UUID

class AuthService(
    private val repo: AuthRepository,
    private val jwtSecret: String,
    private val jwtIssuer: String,
    private val jwtAudience: String,
    private val accessTtlMinutes: Long = 15,
    private val refreshTtlDays: Long = 7
) {
    private val algorithm = Algorithm.HMAC256(jwtSecret)

    // ─── Register ─────────────────────────────────────────────────────────────

    fun register(req: RegisterRequest): AuthResponse {
        require(req.email.contains("@")) { "Invalid email address" }
        require(req.password.length >= 8) { "Password must be at least 8 characters" }
        require(req.orgName.isNotBlank()) { "Organization name required" }
        require(req.restaurantName.isNotBlank()) { "Restaurant name required" }
        require(req.name.isNotBlank()) { "Name required" }
        check(!repo.emailExists(req.email)) { "Email already registered" }

        val passwordHash = BCrypt.hashpw(req.password, BCrypt.gensalt(12))
        val (org, restaurant, user) = repo.createOrgRestaurantAndOwner(
            orgName        = req.orgName,
            restaurantName = req.restaurantName,
            timezone       = req.timezone,
            email          = req.email,
            passwordHash   = passwordHash,
            name           = req.name
        )
        return issueTokens(user, org.id)
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    fun login(req: LoginRequest): AuthResponse {
        val user = repo.findUserByEmail(req.email)
            ?: throw SecurityException("Invalid credentials")
        check(user.isActive) { throw SecurityException("Account disabled") }
        check(BCrypt.checkpw(req.password, user.passwordHash)) {
            throw SecurityException("Invalid credentials")
        }
        val restaurant = repo.findRestaurantById(user.restaurantId)
            ?: error("Restaurant not found for user")
        return issueTokens(user, restaurant.organizationId)
    }

    // ─── Refresh ──────────────────────────────────────────────────────────────

    fun refresh(req: RefreshRequest): AuthResponse {
        val tokenHash = hashToken(req.refreshToken)
        val userId = repo.findAndConsumeRefreshToken(tokenHash)
            ?: throw SecurityException("Invalid or expired refresh token")
        val user = repo.findUserById(userId)
            ?: throw SecurityException("User not found")
        val restaurant = repo.findRestaurantById(user.restaurantId)
            ?: error("Restaurant not found")
        return issueTokens(user, restaurant.organizationId)
    }

    // ─── Get Profile ──────────────────────────────────────────────────────────

    fun getProfile(userId: UUID): UserProfile {
        val user = repo.findUserById(userId)
            ?: throw NoSuchElementException("User not found")
        val restaurant = repo.findRestaurantById(user.restaurantId)
            ?: error("Restaurant not found")
        return user.toProfile(restaurant.organizationId)
    }

    // ─── Internal Token Helpers ───────────────────────────────────────────────

    private fun issueTokens(user: User, orgId: UUID): AuthResponse {
        val accessToken = JWT.create()
            .withIssuer(jwtIssuer)
            .withAudience(jwtAudience)
            .withSubject(user.id.toString())
            .withClaim("restaurantId", user.restaurantId.toString())
            .withClaim("organizationId", orgId.toString())
            .withClaim("role", user.role.name)
            .withExpiresAt(Instant.now().plus(accessTtlMinutes, ChronoUnit.MINUTES))
            .sign(algorithm)

        val rawRefreshToken = generateSecureToken()
        repo.saveRefreshToken(
            userId    = user.id,
            tokenHash = hashToken(rawRefreshToken),
            expiresAt = Instant.now().plus(refreshTtlDays, ChronoUnit.DAYS)
        )

        return AuthResponse(
            accessToken  = accessToken,
            refreshToken = rawRefreshToken,
            user         = user.toProfile(orgId)
        )
    }

    private fun generateSecureToken(): String {
        val bytes = ByteArray(48)
        SecureRandom().nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun hashToken(token: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        return Base64.getEncoder().encodeToString(digest.digest(token.toByteArray()))
    }

    private fun User.toProfile(orgId: UUID) = UserProfile(
        id             = id.toString(),
        email          = email,
        name           = name,
        role           = role.name,
        restaurantId   = restaurantId.toString(),
        organizationId = orgId.toString()
    )
}
