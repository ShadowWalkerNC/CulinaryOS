import Foundation

// MARK: - Staff Authentication Model
public struct StaffUser: Codable, Identifiable, Equatable {
    public let id: String
    public let name: String
    public let role: String // "manager", "server", "kitchen", "bartender"
    public let pin: String
    public let isManager: Bool
    public let accessToken: String?

    public init(id: String, name: String, role: String, pin: String, isManager: Bool, accessToken: String? = nil) {
        self.id = id
        self.name = name
        self.role = role
        self.pin = pin
        self.isManager = isManager
        self.accessToken = accessToken
    }
}

// MARK: - Menu Item Model
public struct MenuItem: Codable, Identifiable, Equatable {
    public let id: String
    public let name: String
    public let category: String
    public let priceCents: Int
    public let description: String
    public let station: String
    public let allergens: [String]
    public var isAvailable: Bool

    public var formattedPrice: String {
        let dollars = Double(priceCents) / 100.0
        return String(format: "$%.2f", dollars)
    }

    public init(
        id: String,
        name: String,
        category: String,
        priceCents: Int,
        description: String,
        station: String = "grill",
        allergens: [String] = [],
        isAvailable: Bool = true
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.priceCents = priceCents
        self.description = description
        self.station = station
        self.allergens = allergens
        self.isAvailable = isAvailable
    }
}

// MARK: - Order Item Model (with Seat & Course Pacing)
public struct OrderItem: Codable, Identifiable, Equatable {
    public let id: String
    public let menuItemId: String
    public let name: String
    public let priceCents: Int
    public var quantity: Int
    public var seatNumber: Int
    public var course: Int // 1 = Immediate/Starters, 2 = Hold/Entrees
    public var modifiers: [String]
    public var instructions: String

    public var totalCents: Int {
        return priceCents * quantity
    }

    public var formattedTotal: String {
        let dollars = Double(totalCents) / 100.0
        return String(format: "$%.2f", dollars)
    }

    public init(
        id: String = UUID().uuidString,
        menuItemId: String,
        name: String,
        priceCents: Int,
        quantity: Int = 1,
        seatNumber: Int = 1,
        course: Int = 1,
        modifiers: [String] = [],
        instructions: String = ""
    ) {
        self.id = id
        self.menuItemId = menuItemId
        self.name = name
        self.priceCents = priceCents
        self.quantity = quantity
        self.seatNumber = seatNumber
        self.course = course
        self.modifiers = modifiers
        self.instructions = instructions
    }
}

// MARK: - Restaurant Order Model
public struct RestaurantOrder: Codable, Identifiable, Equatable {
    public let id: String
    public let orderNumber: String
    public let tableNumber: String
    public let serverName: String
    public var status: String // "pending", "fired", "ready", "paid"
    public var items: [OrderItem]
    public let createdAt: Date
    public var isOfflineQueued: Bool

    public var totalCents: Int {
        return items.reduce(0) { $0 + $1.totalCents }
    }

    public var formattedTotal: String {
        let dollars = Double(totalCents) / 100.0
        return String(format: "$%.2f", dollars)
    }

    public init(
        id: String = UUID().uuidString,
        orderNumber: String,
        tableNumber: String,
        serverName: String,
        status: String = "pending",
        items: [OrderItem],
        createdAt: Date = Date(),
        isOfflineQueued: Bool = false
    ) {
        self.id = id
        self.orderNumber = orderNumber
        self.tableNumber = tableNumber
        self.serverName = serverName
        self.status = status
        self.items = items
        self.createdAt = createdAt
        self.isOfflineQueued = isOfflineQueued
    }
}

// MARK: - Offline Outbox Envelope (Rule 7 Idempotent Sync)
public struct OfflineOrderEnvelope: Codable, Identifiable, Equatable {
    public let id: String
    public let idempotencyKey: String
    public let tableNumber: String
    public let serverName: String
    public let items: [OrderItem]
    public let createdAt: Date

    public init(
        id: String = UUID().uuidString,
        idempotencyKey: String = "ios-ord-\(UUID().uuidString)",
        tableNumber: String,
        serverName: String,
        items: [OrderItem],
        createdAt: Date = Date()
    ) {
        self.id = id
        self.idempotencyKey = idempotencyKey
        self.tableNumber = tableNumber
        self.serverName = serverName
        self.items = items
        self.createdAt = createdAt
    }
}
