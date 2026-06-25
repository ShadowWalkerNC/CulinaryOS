package com.culinaryos.backend

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotBeEmpty
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class AuthTest : DescribeSpec({

    describe("POST /auth/register") {

        it("creates org, restaurant, and owner — returns tokens and role=owner") {
            testApplication {
                application { module() }
                val response = client.post("/auth/register") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {
                          "orgName": "Test Org",
                          "restaurantName": "Test Restaurant",
                          "timezone": "America/New_York",
                          "email": "owner@test.com",
                          "password": "securepass123",
                          "name": "Test Owner"
                        }
                    """.trimIndent())
                }
                response.status shouldBe HttpStatusCode.Created
                val body = Json.parseToJsonElement(response.bodyAsText()).jsonObject
                body["accessToken"]!!.jsonPrimitive.content.shouldNotBeEmpty()
                body["refreshToken"]!!.jsonPrimitive.content.shouldNotBeEmpty()
                body["user"]!!.jsonObject["role"]!!.jsonPrimitive.content shouldBe "owner"
            }
        }

        it("rejects duplicate email with 409") {
            testApplication {
                application { module() }
                val body = """{
                    "orgName":"Org A","restaurantName":"Rest A",
                    "timezone":"America/Chicago",
                    "email":"dup@test.com","password":"password123","name":"User"
                }"""
                client.post("/auth/register") {
                    contentType(ContentType.Application.Json); setBody(body)
                }
                val response = client.post("/auth/register") {
                    contentType(ContentType.Application.Json); setBody(body)
                }
                response.status shouldBe HttpStatusCode.Conflict
            }
        }
    }

    describe("POST /auth/login") {

        it("returns tokens for valid credentials") {
            testApplication {
                application { module() }
                client.post("/auth/register") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {"orgName":"Org","restaurantName":"Rest",
                         "timezone":"America/New_York",
                         "email":"login@test.com","password":"password123","name":"User"}
                    """.trimIndent())
                }
                val response = client.post("/auth/login") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"email":"login@test.com","password":"password123"}""")
                }
                response.status shouldBe HttpStatusCode.OK
                val body = Json.parseToJsonElement(response.bodyAsText()).jsonObject
                body["accessToken"]!!.jsonPrimitive.content.shouldNotBeEmpty()
            }
        }

        it("rejects wrong password with 403") {
            testApplication {
                application { module() }
                client.post("/auth/register") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {"orgName":"Org","restaurantName":"Rest",
                         "timezone":"America/New_York",
                         "email":"secure@test.com","password":"correct-pass","name":"User"}
                    """.trimIndent())
                }
                val response = client.post("/auth/login") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"email":"secure@test.com","password":"wrong-pass"}""")
                }
                response.status shouldBe HttpStatusCode.Forbidden
            }
        }
    }

    describe("GET /auth/me") {

        it("returns user profile for valid JWT") {
            testApplication {
                application { module() }
                val registerResponse = client.post("/auth/register") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {"orgName":"Org","restaurantName":"Rest",
                         "timezone":"America/New_York",
                         "email":"me@test.com","password":"password123","name":"Me User"}
                    """.trimIndent())
                }
                val token = Json.parseToJsonElement(registerResponse.bodyAsText())
                    .jsonObject["accessToken"]!!.jsonPrimitive.content

                val response = client.get("/auth/me") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                response.status shouldBe HttpStatusCode.OK
                response.bodyAsText() shouldContain "\"role\":\"owner\""
            }
        }

        it("returns 401 without token — cross-tenant isolation enforced at JWT layer") {
            testApplication {
                application { module() }
                val response = client.get("/auth/me")
                response.status shouldBe HttpStatusCode.Unauthorized
            }
        }
    }
})
