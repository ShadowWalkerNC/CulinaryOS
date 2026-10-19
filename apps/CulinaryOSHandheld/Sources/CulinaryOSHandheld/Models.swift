import Foundation

// MARK: - Staff Authentication Model
public struct StaffUser: Codable, Identifiable, Equatable {
    public let id: String
    public let name: String
    public let role: String // "manager", "server", "kitchen", "bartender"
    public let pin: String
    public let isManager: Bool
    
    public init(id: String, name: String, role: String, pin: String, isManager: Bool) {
        self.id = id
        self.name = name
        self.role = role
        self.pin = pin
        self.isManager = isManager
    }
}

// MARK: - Menu Item Model
public struct MenuItem: Codable, Identifiable, Equatable {
    public let id: String
    public let name: String
    public let category: String
    public let priceCents: Int
    public let description: String
    public var isAvailable: Bool
    
    public var formattedPrice: String {
        let dollars = Double(priceCents) / 100.0
        return String(format: "$%.2f", dollars)
    }
    
    public init(id: String, name: String, category: String, priceCents: Int, description: String, isAvailable: Bool = true) {
        self.id = id
        self.name = name
        self.category = category
        self.priceCents = priceCents
        self.description = description
        self.isAvailable = isAvailable
    }
}

// MARK: - Order Item Model
public struct OrderItem: Codable, Identifiable, Equatable {
    public let id: String
    public let menuItemId: String
    public let name: String
    public let priceCents: Int
    public var quantity: Int
    public var modifiers: [String]
    public var instructions: String
    
    public var totalCents: Int {
        return priceCents * quantity
    }
    
    public var formattedTotal: String {
        let dollars = Double(totalCents) / 100.0
        return String(format: "$%.2f", dollars)
    }
    
    public init(id: String = UUID().uuidString, menuItemId: String, name: String, priceCents: Int, quantity: Int = 1, modifiers: [String] = [], instructions: String = "") {
        self.id = id
        self.menuItemId = menuItemId
        self.name = name
        self.priceCents = priceCents
        self.quantity = quantity
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
    
    public var totalCents: Int {
        return items.reduce(0) { $0 + $1.totalCents }
    }
    
    public var formattedTotal: String {
        let dollars = Double(totalCents) / 100.0
        return String(format: "$%.2f", dollars)
    }
    
    public init(id: String = UUID().uuidString, orderNumber: String, tableNumber: String, serverName: String, status: String = "pending", items: [OrderItem], createdAt: Date = Date()) {
        self.id = id
        self.orderNumber = orderNumber
        self.tableNumber = tableNumber
        self.serverName = serverName
        self.status = status
        self.items = items
        self.createdAt = createdAt
    }
}
