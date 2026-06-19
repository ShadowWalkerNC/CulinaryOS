package com.culinaryos.backend

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.comparables.shouldBeLessThanOrEqualTo
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.*

class InventoryTest : DescribeSpec({

    suspend fun ApplicationTestBuilder.registerAndToken(tag: String = ""): Pair<String, String> {
        val res = client.post("/auth/register") {
            contentType(ContentType.Application.Json)
            setBody("""{"orgName":"InvOrg$tag","restaurantName":"InvRest$tag",
                "timezone":"America/Denver",
                "email":"inv${tag}${System.nanoTime()}@test.com",
                "password":"password123","name":"Inv Owner"}""")
        }
        val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
        return Pair(
            body["accessToken"]!!.jsonPrimitive.content,
            body["restaurantId"]!!.jsonPrimitive.content
        )
    }

    // ─── Item CRUD ────────────────────────────────────────────────────────────

    describe("POST /inventory") {
        it("creates an inventory item with par level") {
            testApplication {
                application { module() }
                val (token, _) = registerAndToken("item1")
                val res = client.post("/inventory") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"name":"Ribeye 12oz","unit":"oz","parLevel":24.0,"reorderQuantity":48.0,"costPerUnitCents":1500}""")
                }
                res.status shouldBe HttpStatusCode.Created
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["name"]!!.jsonPrimitive.content shouldBe "Ribeye 12oz"
                body["parLevel"]!!.jsonPrimitive.double shouldBe 24.0
                body["isBelowPar"]!!.jsonPrimitive.boolean shouldBe true
                // currentQuantity starts at 0, par is 24 → below par
            }
        }
    }

    // ─── Depletion ────────────────────────────────────────────────────────────

    describe("Depletion engine") {
        it("depletes stock when a manual WASTE adjustment is applied") {
            testApplication {
                application { module() }
                val (token, _) = registerAndToken("dep1")

                // Create item with starting stock via ADJUSTMENT
                val itemId = Json.parseToJsonElement(
                    client.post("/inventory") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"House Wine","unit":"ml","parLevel":500.0}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                // Add 1000ml via positive ADJUSTMENT
                client.post("/inventory/adjust") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"inventoryItemId":"$itemId","quantityDelta":1000.0,"source":"ADJUSTMENT","notes":"opening count"}""")
                }

                // Waste 300ml
                client.post("/inventory/adjust") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"inventoryItemId":"$itemId","quantityDelta":-300.0,"source":"WASTE","notes":"spilled"}""")
                }

                // Current quantity should be 700ml
                val items = Json.parseToJsonElement(
                    client.get("/inventory") {
                        header(HttpHeaders.Authorization, "Bearer $token")
                    }.bodyAsText()
                ).jsonArray
                val item = items.first { it.jsonObject["id"]!!.jsonPrimitive.content == itemId }.jsonObject
                item["currentQuantity"]!!.jsonPrimitive.double shouldBe 700.0
            }
        }
    }

    // ─── Par Alerts ───────────────────────────────────────────────────────────

    describe("GET /inventory/alerts") {
        it("returns items at or below par level") {
            testApplication {
                application { module() }
                val (token, _) = registerAndToken("par1")

                // Create 2 items — one above par, one below
                val item1Id = Json.parseToJsonElement(
                    client.post("/inventory") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"Lettuce","unit":"head","parLevel":10.0}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                // Stock lettuce above par
                client.post("/inventory/adjust") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"inventoryItemId":"$item1Id","quantityDelta":15.0,"source":"ADJUSTMENT"}""")
                }

                // Create second item — stays at 0 (below par 5)
                client.post("/inventory") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"name":"Tomatoes","unit":"lb","parLevel":5.0}""")
                }

                val alerts = Json.parseToJsonElement(
                    client.get("/inventory/alerts") {
                        header(HttpHeaders.Authorization, "Bearer $token")
                    }.bodyAsText()
                ).jsonArray

                // Only Tomatoes (at 0, par 5) should appear
                alerts shouldHaveSize 1
                alerts[0].jsonObject["name"]!!.jsonPrimitive.content shouldBe "Tomatoes"
            }
        }
    }

    // ─── Purchase Orders ──────────────────────────────────────────────────────

    describe("Purchase Order lifecycle") {
        it("creates a DRAFT PO and lists it") {
            testApplication {
                application { module() }
                val (token, _) = registerAndToken("po1")
                val me = Json.parseToJsonElement(
                    client.get("/auth/me") { header(HttpHeaders.Authorization, "Bearer $token") }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                val itemId = Json.parseToJsonElement(
                    client.post("/inventory") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"Fry Oil","unit":"gal","parLevel":2.0,"costPerUnitCents":800}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                val res = client.post("/purchase-orders") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""
                        {
                          "vendorName": "Sysco",
                          "createdBy": "$me",
                          "lines": [{
                            "inventoryItemId": "$itemId",
                            "inventoryItemName": "Fry Oil",
                            "quantity": 4.0,
                            "unitCostCents": 800
                          }]
                        }
                    """)
                }
                res.status shouldBe HttpStatusCode.Created
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["status"]!!.jsonPrimitive.content    shouldBe "DRAFT"
                body["totalCostCents"]!!.jsonPrimitive.int shouldBe 3200
                body["vendorName"]!!.jsonPrimitive.content shouldBe "Sysco"
            }
        }
    }

    // ─── Auto-draft reorder ───────────────────────────────────────────────────

    describe("Auto-draft reorder rule") {
        it("creates a DRAFT PO when stock drops to par and auto_draft is true") {
            testApplication {
                application { module() }
                val (token, _) = registerAndToken("auto1")

                val itemId = Json.parseToJsonElement(
                    client.post("/inventory") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"Salt","unit":"lb","parLevel":5.0,"reorderQuantity":20.0,"costPerUnitCents":50}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                // Stock to 6 (above par 5)
                client.post("/inventory/adjust") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"inventoryItemId":"$itemId","quantityDelta":6.0,"source":"ADJUSTMENT"}""")
                }

                // Set auto-draft reorder rule
                client.post("/inventory/reorder-rules") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"inventoryItemId":"$itemId","vendorName":"Sysco","autoDraft":true}""")
                }

                // Deplete 2 units → stock = 4 (below par 5) → should trigger auto-draft
                client.post("/inventory/adjust") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"inventoryItemId":"$itemId","quantityDelta":-2.0,"source":"WASTE"}""")
                }

                // A DRAFT PO should now exist
                val pos = Json.parseToJsonElement(
                    client.get("/purchase-orders?status=DRAFT") {
                        header(HttpHeaders.Authorization, "Bearer $token")
                    }.bodyAsText()
                ).jsonArray

                pos shouldHaveSize 1
                pos[0].jsonObject["vendorName"]!!.jsonPrimitive.content shouldBe "Sysco"
            }
        }
    }
})
