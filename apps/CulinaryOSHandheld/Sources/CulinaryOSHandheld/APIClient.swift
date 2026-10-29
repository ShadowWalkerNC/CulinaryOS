import Foundation

@MainActor
public class CulinaryAPIClient: ObservableObject {
    public static let shared = CulinaryAPIClient()

    private static let serverUrlKey = "culinaryos_ios_server_url"
    private static let tenantIdKey = "culinaryos_ios_tenant_id"
    private static let offlineOutboxKey = "culinaryos_ios_offline_outbox"

    @Published public var currentUser: StaffUser? = nil
    @Published public var activeOrders: [RestaurantOrder] = []
    @Published public var menuCatalog: [MenuItem] = []
    @Published public var pendingOfflineOrders: [OfflineOrderEnvelope] = []
    @Published public var serverBaseURL: String {
        didSet {
            UserDefaults.standard.set(serverBaseURL, forKey: Self.serverUrlKey)
        }
    }
    @Published public var tenantId: String {
        didSet {
            UserDefaults.standard.set(tenantId, forKey: Self.tenantIdKey)
        }
    }
    @Published public var isConnected: Bool = true
    @Published public var isSyncing: Bool = false

    public init() {
        self.serverBaseURL = UserDefaults.standard.string(forKey: Self.serverUrlKey) ?? "http://localhost:3000"
        self.tenantId = UserDefaults.standard.string(forKey: Self.tenantIdKey) ?? "00000000-0000-0000-0000-000000000001"
        loadOfflineOutbox()
        loadMockCatalog()
        loadMockOrders()
    }

    // MARK: - Staff PIN Authentication (Live API + Offline Fallback)
    public func loginWithPIN(_ pin: String) async -> Bool {
        if let url = URL(string: "\(serverBaseURL)/v1/auth/pin-login") {
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.timeoutInterval = 3.5
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(tenantId, forHTTPHeaderField: "X-Tenant-Id")
            req.httpBody = try? JSONSerialization.data(withJSONObject: ["pin": pin])

            do {
                let (data, response) = try await URLSession.shared.data(for: req)
                if let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) {
                    isConnected = true
                    let json = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
                    let session = json["session"] as? [String: Any]
                    let token = session?["access_token"] as? String
                    let isMgr = (pin == "5678")
                    currentUser = StaffUser(
                        id: isMgr ? "staff-mgr-001" : "staff-srv-002",
                        name: isMgr ? "Elena Rostova" : "Marcus Vance",
                        role: isMgr ? "manager" : "server",
                        pin: pin,
                        isManager: isMgr,
                        accessToken: token
                    )
                    await refreshCatalogAndOrders()
                    return true
                }
            } catch {
                isConnected = false
            }
        }

        // Offline Fallback matching CulinaryOS Auth Spec
        if pin == "5678" {
            currentUser = StaffUser(id: "staff-mgr-001", name: "Elena Rostova", role: "manager", pin: "5678", isManager: true)
            return true
        } else if pin == "1234" {
            currentUser = StaffUser(id: "staff-srv-002", name: "Marcus Vance", role: "server", pin: "1234", isManager: false)
            return true
        } else if pin == "9999" {
            currentUser = StaffUser(id: "staff-boh-003", name: "Damon Brody", role: "kitchen", pin: "9999", isManager: false)
            return true
        }
        return false
    }

    public func logout() {
        currentUser = nil
    }

    // MARK: - Zero-Config LAN & mDNS Discovery
    public func discoverLanServer() async -> String? {
        let candidates = [serverBaseURL, "http://culinaryos.local:3000", "http://localhost:3000"]
        for candidate in candidates {
            guard let url = URL(string: "\(candidate)/v1/displays/discover") else { continue }
            var req = URLRequest(url: url)
            req.timeoutInterval = 2.5
            if let (data, response) = try? await URLSession.shared.data(for: req),
               let http = response as? HTTPURLResponse,
               (200..<300).contains(http.statusCode),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let payload = (json["data"] as? [String: Any]) ?? json
                if let surfaces = payload["surfaces"] as? [String: Any],
                   let discoveredApi = surfaces["api"] as? String {
                    serverBaseURL = discoveredApi
                    isConnected = true
                    return discoveredApi
                }
            }
        }
        return nil
    }

    // MARK: - Live Catalog & Order Synchronization
    public func refreshCatalogAndOrders() async {
        isSyncing = true
        defer { isSyncing = false }

        await flushOfflineOutbox()

        // 1. Fetch Live Orders
        if let ordersUrl = URL(string: "\(serverBaseURL)/v1/orders") {
            var req = URLRequest(url: ordersUrl)
            req.timeoutInterval = 3.5
            req.setValue(tenantId, forHTTPHeaderField: "X-Tenant-Id")
            if let token = currentUser?.accessToken {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }

            if let (data, response) = try? await URLSession.shared.data(for: req),
               let http = response as? HTTPURLResponse,
               (200..<300).contains(http.statusCode),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let rawOrders = json["data"] as? [[String: Any]] {
                isConnected = true
                let parsed: [RestaurantOrder] = rawOrders.compactMap { dict in
                    let id = (dict["id"] as? String) ?? UUID().uuidString
                    let tableNum = (dict["table_number"] as? String) ?? (dict["table_id"] as? String) ?? "T-01"
                    let status = (dict["status"] as? String) ?? "fired"
                    let rawItems = (dict["items"] as? [[String: Any]]) ?? []
                    let items: [OrderItem] = rawItems.map { itemDict in
                        OrderItem(
                            id: (itemDict["id"] as? String) ?? UUID().uuidString,
                            menuItemId: (itemDict["menu_item_id"] as? String) ?? "m-01",
                            name: (itemDict["name"] as? String) ?? "Menu Item",
                            priceCents: (itemDict["price_cents"] as? Int) ?? (itemDict["unit_price"] as? Int) ?? 1200,
                            quantity: (itemDict["quantity"] as? Int) ?? 1,
                            seatNumber: (itemDict["seat_number"] as? Int) ?? 1,
                            course: (itemDict["course"] as? Int) ?? 1,
                            modifiers: (itemDict["modifiers"] as? [String]) ?? []
                        )
                    }
                    return RestaurantOrder(
                        id: id,
                        orderNumber: (dict["order_number"] as? String) ?? "#\(id.prefix(4))",
                        tableNumber: tableNum,
                        serverName: (dict["server_name"] as? String) ?? (currentUser?.name ?? "Handheld"),
                        status: status,
                        items: items
                    )
                }
                if !parsed.isEmpty {
                    activeOrders = parsed
                }
            }
        }
    }

    // MARK: - Tableside Order Dispatch (Rule 15: POST /v1/orders + PATCH /v1/orders/:id/send)
    public func dispatchOrder(tableNumber: String, items: [OrderItem]) async {
        let orderNumber = String(format: "#%03d", activeOrders.count + 101)
        let idempotencyKey = "ios-\(UUID().uuidString)"
        let serverName = currentUser?.name ?? "Handheld #1"

        var syncedRemotely = false
        if let createUrl = URL(string: "\(serverBaseURL)/v1/orders") {
            var req = URLRequest(url: createUrl)
            req.httpMethod = "POST"
            req.timeoutInterval = 4.0
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(tenantId, forHTTPHeaderField: "X-Tenant-Id")
            req.setValue(idempotencyKey, forHTTPHeaderField: "Idempotency-Key")
            if let token = currentUser?.accessToken {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }

            let payload: [String: Any] = [
                "table_number": tableNumber,
                "order_type": "dine_in",
                "items": items.map { item in
                    [
                        "menu_item_id": item.menuItemId,
                        "name": item.name,
                        "quantity": item.quantity,
                        "unit_price": item.priceCents,
                        "seat_number": item.seatNumber,
                        "course": item.course,
                        "modifiers": item.modifiers,
                        "special_instructions": item.instructions
                    ]
                }
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

            if let (data, response) = try? await URLSession.shared.data(for: req),
               let http = response as? HTTPURLResponse,
               (200..<300).contains(http.statusCode) {
                let json = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
                let orderData = (json["data"] as? [String: Any]) ?? json
                let createdId = (orderData["id"] as? String) ?? UUID().uuidString

                // Rule 15: Fire to kitchen via PATCH /v1/orders/:id/send
                if let sendUrl = URL(string: "\(serverBaseURL)/v1/orders/\(createdId)/send") {
                    var sendReq = URLRequest(url: sendUrl)
                    sendReq.httpMethod = "PATCH"
                    sendReq.timeoutInterval = 4.0
                    sendReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    sendReq.setValue(tenantId, forHTTPHeaderField: "X-Tenant-Id")
                    _ = try? await URLSession.shared.data(for: sendReq)
                }
                isConnected = true
                syncedRemotely = true
            } else {
                isConnected = false
            }
        }

        if !syncedRemotely {
            let envelope = OfflineOrderEnvelope(
                idempotencyKey: idempotencyKey,
                tableNumber: tableNumber,
                serverName: serverName,
                items: items
            )
            pendingOfflineOrders.append(envelope)
            saveOfflineOutbox()
        }

        let newOrder = RestaurantOrder(
            orderNumber: orderNumber,
            tableNumber: tableNumber,
            serverName: serverName,
            status: "fired",
            items: items,
            createdAt: Date(),
            isOfflineQueued: !syncedRemotely
        )
        activeOrders.insert(newOrder, at: 0)
    }

    public func flushOfflineOutbox() async {
        guard !pendingOfflineOrders.isEmpty else { return }
        var remaining: [OfflineOrderEnvelope] = []

        for env in pendingOfflineOrders {
            guard let createUrl = URL(string: "\(serverBaseURL)/v1/orders") else {
                remaining.append(env)
                continue
            }
            var req = URLRequest(url: createUrl)
            req.httpMethod = "POST"
            req.timeoutInterval = 3.5
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(tenantId, forHTTPHeaderField: "X-Tenant-Id")
            req.setValue(env.idempotencyKey, forHTTPHeaderField: "Idempotency-Key")

            let payload: [String: Any] = [
                "table_number": env.tableNumber,
                "order_type": "dine_in",
                "items": env.items.map { item in
                    [
                        "menu_item_id": item.menuItemId,
                        "name": item.name,
                        "quantity": item.quantity,
                        "unit_price": item.priceCents,
                        "seat_number": item.seatNumber,
                        "course": item.course
                    ]
                }
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

            if let (_, response) = try? await URLSession.shared.data(for: req),
               let http = response as? HTTPURLResponse,
               (200..<300).contains(http.statusCode) {
                isConnected = true
            } else {
                remaining.append(env)
            }
        }

        pendingOfflineOrders = remaining
        saveOfflineOutbox()
    }

    public func bumpOrderStatus(orderId: String, newStatus: String) async {
        if let idx = activeOrders.firstIndex(where: { $0.id == orderId }) {
            activeOrders[idx].status = newStatus
        }

        if newStatus == "ready", let bumpUrl = URL(string: "\(serverBaseURL)/v1/displays/bump") {
            var req = URLRequest(url: bumpUrl)
            req.httpMethod = "POST"
            req.timeoutInterval = 3.5
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(tenantId, forHTTPHeaderField: "X-Tenant-Id")
            req.httpBody = try? JSONSerialization.data(withJSONObject: ["ticketId": orderId])
            _ = try? await URLSession.shared.data(for: req)
        }
    }

    // MARK: - Offline Outbox Persistence
    private func saveOfflineOutbox() {
        if let encoded = try? JSONEncoder().encode(pendingOfflineOrders) {
            UserDefaults.standard.set(encoded, forKey: Self.offlineOutboxKey)
        }
    }

    private func loadOfflineOutbox() {
        if let data = UserDefaults.standard.data(forKey: Self.offlineOutboxKey),
           let decoded = try? JSONDecoder().decode([OfflineOrderEnvelope].self, from: data) {
            pendingOfflineOrders = decoded
        }
    }

    // MARK: - Initial Seed Data (FDA Top 9 Allergen Tagged)
    private func loadMockCatalog() {
        menuCatalog = [
            MenuItem(id: "m-01", name: "Truffle Parm Fries", category: "Starters", priceCents: 1200, description: "Hand-cut Idaho potatoes, white truffle oil, shaved pecorino", station: "fry", allergens: ["dairy"]),
            MenuItem(id: "m-02", name: "Crispy Buffalo Wings", category: "Starters", priceCents: 1600, description: "1 lb jumbo wings, house cayenne glaze, Danish blue cheese", station: "fry", allergens: ["dairy"]),
            MenuItem(id: "m-03", name: "Culinary Smash Burger", category: "Mains", priceCents: 1850, description: "Two 4oz Angus patties, aged cheddar, brioche bun, secret spread", station: "grill", allergens: ["gluten", "dairy", "egg"]),
            MenuItem(id: "m-04", name: "Wood-Fired Margherita", category: "Mains", priceCents: 1900, description: "San Marzano D.O.P., fior di latte mozzarella, fresh basil, EVOO", station: "pizza", allergens: ["gluten", "dairy"]),
            MenuItem(id: "m-05", name: "Spicy Rigatoni Vodka", category: "Mains", priceCents: 2200, description: "Calabrian chili cream, organic tomatoes, basil oil", station: "hot", allergens: ["gluten", "dairy"]),
            MenuItem(id: "m-06", name: "Local Hazy IPA (Pint)", category: "Beverages", priceCents: 850, description: "Draft 6.8% ABV, notes of mango, pineapple, and citrus zest", station: "bar", allergens: ["gluten"]),
            MenuItem(id: "m-07", name: "Classic Espresso Martini", category: "Beverages", priceCents: 1500, description: "Vodka, fresh pull espresso, coffee liqueur, Madagascar vanilla", station: "bar", allergens: []),
        ]
    }

    private func loadMockOrders() {
        activeOrders = [
            RestaurantOrder(
                orderNumber: "#101",
                tableNumber: "T-04",
                serverName: "Marcus Vance",
                status: "fired",
                items: [
                    OrderItem(menuItemId: "m-03", name: "Culinary Smash Burger", priceCents: 1850, quantity: 2, seatNumber: 1, course: 2, modifiers: ["Medium Rare", "Extra Pickles"]),
                    OrderItem(menuItemId: "m-01", name: "Truffle Parm Fries", priceCents: 1200, quantity: 1, seatNumber: 1, course: 1, modifiers: []),
                    OrderItem(menuItemId: "m-06", name: "Local Hazy IPA (Pint)", priceCents: 850, quantity: 2, seatNumber: 2, course: 1, modifiers: [])
                ]
            ),
            RestaurantOrder(
                orderNumber: "#102",
                tableNumber: "Bar-02",
                serverName: "Elena Rostova",
                status: "ready",
                items: [
                    OrderItem(menuItemId: "m-07", name: "Classic Espresso Martini", priceCents: 1500, quantity: 3, seatNumber: 1, course: 1, modifiers: ["Oat Milk Sub"])
                ]
            )
        ]
    }
}
