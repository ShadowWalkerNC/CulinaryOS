package com.culinaryos.backend.db

import org.flywaydb.core.Flyway
import org.jetbrains.exposed.sql.Database

object DatabaseFactory {
    fun init() {
        val host     = System.getenv("DB_HOST")     ?: "localhost"
        val port     = System.getenv("DB_PORT")     ?: "5432"
        val name     = System.getenv("DB_NAME")     ?: "culinaryos"
        val user     = System.getenv("DB_USER")     ?: "culinaryos"
        val password = System.getenv("DB_PASSWORD") ?: error("DB_PASSWORD env var required")

        val jdbcUrl = "jdbc:postgresql://$host:$port/$name"

        // Run Flyway migrations before connecting Exposed
        Flyway.configure()
            .dataSource(jdbcUrl, user, password)
            .locations("classpath:db/migrations")
            .baselineOnMigrate(true)
            .load()
            .migrate()

        Database.connect(
            url = jdbcUrl,
            driver = "org.postgresql.Driver",
            user = user,
            password = password
        )
    }
}
