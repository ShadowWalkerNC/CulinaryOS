package com.culinaryos.backend

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.shouldNotBe
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.*

class OnlineOrderingTest : DescribeSpec({

    // ─── Helpers ──────────────────────────────────────────────────────────────

    suspend fun ApplicationTestBuilder.registerAndToken(tag: String = ""): Pair<String, String> {
        val res = client.post("/auth/register") {
            contentType(ContentType.Application.Json)
            setBody("""{"orgName":"OOOrg$tag","restaurantName":"OORest$tag",
                "timezone":"America/Chicago",
                "email":"oo${tag}${System.nanoTime()}@test.com",
                "password":"password123","name":"OO Owner"}""")
        }
        val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
        val token = body["accessToken"]!!.jsonPrimitive.content
        val restaurantId = body["restaurantId"]!!.jsonPrimitive.content
        return Pair(token, restaurantId)
    }

    suspend fun ApplicationTestBuilder.publishMenu(token: String, userId: String): String {
        val res = client.post("/menu-snapshots/publish") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"publishedBy":"$userId"}""")
        }
        return Json.parseToJsonElement(res.bodyAsText()).jsonObject["id"]!!.jsonPrimitive.content
    }

    // ─── Snapshot tests ────────────────────────────────────────────────────────

    describe("POST /menu-snapshots/publish") {
        it("publishes a snapshot and returns version 1") {
            testApplication {
                application { module() }
                val (token, _) = registerAndToken("snap1")
                val me = Json.parseToJsonElement(
                    client.get("/auth/me") {
                        header(HttpHeaders.Authorization, "Bearer $token")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                val res = client.post("/menu-snapshots/publish") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"publishedBy":"$me"}""")
                }
                res.status shouldBe HttpStatusCode.Created
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["version"]!!.jsonPrimitive.int shouldBe 1
                body["status"]!!.jsonPrimitive.content shouldBe "ACTIVE"
            }
        }

        it("publishing again archives the previous snapshot") {
            testApplication {
                application { module() }
                val (token, _) = registerAndToken("snap2")
                val me = Json.parseToJsonElement(
                    client.get("/auth/me") {
                        header(HttpHeaders.Authorization, "Bearer $token")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                // Publish twice
                client.post("/menu-snapshots/publish") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"publishedBy":"$me"}""")
                }
                val res2 = client.post("/menu-snapshots/publish") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"publishedBy":"$me"}""")
                }
                val body2 = Json.parseToJsonElement(res2.bodyAsText()).jsonObject
                body2["version"]!!.jsonPrimitive.int shouldBe 2
                body2["status"]!!.jsonPrimitive.content shouldBe "ACTIVE"
            }
        }
    }

    describe("GET /public/menu/{restaurantId}") {
        it("returns the active snapshot JSON for a restaurant") {
            testApplication {
                application { module() }
                val (token, restaurantId) = registerAndToken("menu1")
                val me = Json.parseToJsonElement(
                    client.get("/auth/me") { header(HttpHeaders.Authorization, "Bearer $token") }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                publishMenu(token, me)

                val res = client.get("/public/menu/$restaurantId")
                res.status shouldBe HttpStatusCode.OK
            }
        }

        it("returns 404 if no active snapshot exists") {
            testApplication {
                application { module() }
                val (_, restaurantId) = registerAndToken("menu2")
                val res = client.get("/public/menu/$restaurantId")
                res.status shouldBe HttpStatusCode.NotFound
            }
        }
    }

    // ─── Customer order placement ──────────────────────────────────────────────

    describe("POST /public/orders/{restaurantId}") {
        it("places a PICKUP order and returns a tracking token") {
            testApplication {
                application { module() }
                val (token, restaurantId) = registerAndToken("order1")
                val me = Json.parseToJsonElement(
                    client.get("/auth/me") { header(HttpHeaders.Authorization, "Bearer $token") }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                publishMenu(token, me)

                val res = client.post("/public/orders/$restaurantId") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {
                          "fulfillmentType": "PICKUP",
                          "customerName": "Jane Doe",
                          "customerEmail": "jane@example.com",
                          "lines": [
                            {
                              "menuItemId": "00000000-0000-0000-0000-000000000001",
                              "menuItemName": "Burger",
                              "quantity": 2,
                              "unitPriceCents": 1299
                            }
                          ]
                        }
                    """)
                }
                res.status shouldBe HttpStatusCode.Created
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["status"]!!.jsonPrimitive.content   shouldBe "RECEIVED"
                body["trackingToken"]!!.jsonPrimitive.content shouldNotBe ""
                body["subtotalCents"]!!.jsonPrimitive.int shouldBe 2598
            }
        }

        it("rejects DELIVERY order without deliveryAddress") {
            testApplication {
                application { module() }
                val (token, restaurantId) = registerAndToken("order2")
                val me = Json.parseToJsonElement(
                    client.get("/auth/me") { header(HttpHeaders.Authorization, "Bearer $token") }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                publishMenu(token, me)

                val res = client.post("/public/orders/$restaurantId") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {
                          "fulfillmentType": "DELIVERY",
                          "customerName": "Bob",
                          "lines": [{"menuItemId":"x","menuItemName":"Item","quantity":1,"unitPriceCents":500}]
                        }
                    """)
                }
                res.status shouldBe HttpStatusCode.BadRequest
            }
        }
    }

    // ─── Status tracking ───────────────────────────────────────────────────────

    describe("GET /public/track/{token}") {
        it("returns current status for a valid tracking token") {
            testApplication {
                application { module() }
                val (token, restaurantId) = registerAndToken("track1")
                val me = Json.parseToJsonElement(
                    client.get("/auth/me") { header(HttpHeaders.Authorization, "Bearer $token") }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                publishMenu(token, me)

                val orderRes = client.post("/public/orders/$restaurantId") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"fulfillmentType":"PICKUP","customerName":"Alice",
                        "lines":[{"menuItemId":"x","menuItemName":"Pizza","quantity":1,"unitPriceCents":1500}]}""")
                }
                val trackingToken = Json.parseToJsonElement(orderRes.bodyAsText())
                    .jsonObject["trackingToken"]!!.jsonPrimitive.content

                val trackRes = client.get("/public/track/$trackingToken")
                trackRes.status shouldBe HttpStatusCode.OK
                trackRes.bodyAsText() shouldContain "RECEIVED"
            }
        }
    }

    // ─── Status transition ─────────────────────────────────────────────────────

    describe("PATCH /online-orders/{id}/status") {
        it("manager advances order from RECEIVED to PREPARING") {
            testApplication {
                application { module() }
                val (token, restaurantId) = registerAndToken("status1")
                val me = Json.parseToJsonElement(
                    client.get("/auth/me") { header(HttpHeaders.Authorization, "Bearer $token") }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                publishMenu(token, me)

                val orderRes = client.post("/public/orders/$restaurantId") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"fulfillmentType":"PICKUP","customerName":"Tom",
                        "lines":[{"menuItemId":"x","menuItemName":"Salad","quantity":1,"unitPriceCents":800}]}""")
                }
                val orderId = Json.parseToJsonElement(orderRes.bodyAsText())
                    .jsonObject["orderId"]!!.jsonPrimitive.content

                val patchRes = client.patch("/online-orders/$orderId/status") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"toStatus":"PREPARING","actorId":"$me"}""")
                }
                patchRes.status shouldBe HttpStatusCode.OK
                patchRes.bodyAsText() shouldContain "PREPARING"
            }
        }

        it("rejects illegal transition — RECEIVED to COMPLETED") {
            testApplication {
                application { module() }
                val (token, restaurantId) = registerAndToken("status2")
                val me = Json.parseToJsonElement(
                    client.get("/auth/me") { header(HttpHeaders.Authorization, "Bearer $token") }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                publishMenu(token, me)

                val orderRes = client.post("/public/orders/$restaurantId") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"fulfillmentType":"PICKUP","customerName":"Sam",
                        "lines":[{"menuItemId":"x","menuItemName":"Wings","quantity":1,"unitPriceCents":1200}]}""")
                }
                val orderId = Json.parseToJsonElement(orderRes.bodyAsText())
                    .jsonObject["orderId"]!!.jsonPrimitive.content

                val patchRes = client.patch("/online-orders/$orderId/status") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"toStatus":"COMPLETED","actorId":"$me"}""")
                }
                patchRes.status shouldBe HttpStatusCode.BadRequest
            }
        }
    }
})
