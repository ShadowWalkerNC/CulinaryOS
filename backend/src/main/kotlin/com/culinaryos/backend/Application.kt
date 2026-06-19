package com.culinaryos.backend

import com.culinaryos.backend.db.DatabaseFactory
import com.culinaryos.backend.plugins.configureRouting
import com.culinaryos.backend.plugins.configureSerialization
import com.culinaryos.backend.plugins.configureStatusPages
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*

fun main() {
    embeddedServer(
        Netty,
        port = System.getenv("PORT")?.toInt() ?: 8080,
        host = "0.0.0.0",
        module = Application::module
    ).start(wait = true)
}

fun Application.module() {
    DatabaseFactory.init()
    configureSerialization()
    configureStatusPages()
    configureRouting()
}
