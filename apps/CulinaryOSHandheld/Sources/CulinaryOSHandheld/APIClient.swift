import Foundation

@MainActor
public class CulinaryAPIClient: ObservableObject {
    public static let shared = CulinaryAPIClient()
    
    @Published public var currentUser: StaffUser? = nil
    @Published public var activeOrders: [RestaurantOrder] = []
    @Published public var menuCatalog: [MenuItem] = []
    @Published public var serverBaseURL: String = "http://localhost:3000"
    @Published public var isConnected: Bool = true
    
    public init() {
        loadMockCatalog()
        loadMockOrders()
    }
    
    // MARK: - Staff PIN Authentication
    public func loginWithPIN(_ pin: String) -> Bool {
        // Production & Demo PIN mappings matching CulinaryOS Auth Spec
        if pin == "5678" {
            currentUser = StaffUser(
                id: "staff-mgr-001",
                name: "Elena Rostova",
                role: "manager",
                pin: "5678",
                isManager: true
            )
            return true
        } else if pin == "1234" {
            currentUser = StaffUser(
                id: "staff-srv-002",
                name: "Marcus Vance",
                role: "server",
                pin: "1234",
                isManager: false
            )
            return true
        } else if pin == "9999" {
            currentUser = StaffUser(
                id: "staff-boh-003",
                name: "Damon Brody",
                role: "kitchen",
                pin: "9999",
                isManager: false
            )
            return true
        }
        return false
    }
    
    public func logout() {
        currentUser = nil
    }
    
    // MARK: - Tableside Order Management
    public func dispatchOrder(tableNumber: String, items: [OrderItem]) {
        let orderNumber = String(format: "#%03d", activeOrders.count + 101)
        let newOrder = RestaurantOrder(
            orderNumber: orderNumber,
            tableNumber: tableNumber,
            serverName: currentUser?.name ?? "Handheld #1",
            status: "fired",
            items: items,
            createdAt: Date()
        )
        activeOrders.insert(newOrder, at: 0)
    }
    
    public func bumpOrderStatus(orderId: String, newStatus: String) {
        if let idx = activeOrders.firstIndex(where: { $0.id == orderId }) {
            activeOrders[idx].status = newStatus
        }
    }
    
    // MARK: - Mock Initial Seed Data
    private func loadMockCatalog() {
        menuCatalog = [
            MenuItem(id: "m-01", name: "Truffle Parm Fries", category: "Starters", priceCents: 1200, description: "Hand-cut Idaho potatoes, white truffle oil, shaved pecorino"),
            MenuItem(id: "m-02", name: "Crispy Buffalo Wings", category: "Starters", priceCents: 1600, description: "1 lb jumbo wings, house cayenne glaze, Danish blue cheese"),
            MenuItem(id: "m-03", name: "Culinary Smash Burger", category: "Mains", priceCents: 1850, description: "Two 4oz Angus patties, aged cheddar, brioche bun, secret spread"),
            MenuItem(id: "m-04", name: "Wood-Fired Margherita", category: "Mains", priceCents: 1900, description: "San Marzano D.O.P., fior di latte mozzarella, fresh basil, EVOO"),
            MenuItem(id: "m-05", name: "Spicy Rigatoni Vodka", category: "Mains", priceCents: 2200, description: "Calabrian chili cream, organic tomatoes, basil oil"),
            MenuItem(id: "m-06", name: "Local Hazy IPA (Pint)", category: "Beverages", priceCents: 850, description: "Draft 6.8% ABV, notes of mango, pineapple, and citrus zest"),
            MenuItem(id: "m-07", name: "Classic Espresso Martini", category: "Beverages", priceCents: 1500, description: "Vodka, fresh pull espresso, coffee liqueur, Madagascar vanilla"),
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
                    OrderItem(menuItemId: "m-03", name: "Culinary Smash Burger", priceCents: 1850, quantity: 2, modifiers: ["Medium Rare", "Extra Pickles"]),
                    OrderItem(menuItemId: "m-01", name: "Truffle Parm Fries", priceCents: 1200, quantity: 1, modifiers: []),
                    OrderItem(menuItemId: "m-06", name: "Local Hazy IPA (Pint)", priceCents: 850, quantity: 2, modifiers: [])
                ]
            ),
            RestaurantOrder(
                orderNumber: "#102",
                tableNumber: "Bar-02",
                serverName: "Elena Rostova",
                status: "ready",
                items: [
                    OrderItem(menuItemId: "m-07", name: "Classic Espresso Martini", priceCents: 1500, quantity: 3, modifiers: ["Oat Milk Sub"])
                ]
            )
        ]
    }
}
