import SwiftUI

public struct TablesideOrderView: View {
    @ObservedObject var api = CulinaryAPIClient.shared
    @State private var selectedTable: String = "T-01"
    @State private var selectedCategory: String = "All"
    @State private var cartItems: [OrderItem] = []
    @State private var showingCartSheet: Bool = false
    @State private var orderSentBanner: Bool = false
    
    let tables = ["T-01", "T-02", "T-03", "T-04", "Bar-01", "Bar-02", "Patio-01", "Patio-02"]
    let categories = ["All", "Starters", "Mains", "Beverages"]
    
    public init() {}
    
    var filteredItems: [MenuItem] {
        if selectedCategory == "All" {
            return api.menuCatalog
        }
        return api.menuCatalog.filter { $0.category == selectedCategory }
    }
    
    var cartTotalCents: Int {
        cartItems.reduce(0) { $0 + $1.totalCents }
    }
    
    var formattedCartTotal: String {
        let dollars = Double(cartTotalCents) / 100.0
        return String(format: "$%.2f", dollars)
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header Bar
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(selectedTable)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                    Text("Server: \(api.currentUser?.name ?? "Server")")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                // Table Selector Menu
                Menu {
                    ForEach(tables, id: \.self) { table in
                        Button(action: { selectedTable = table }) {
                            Text(table)
                        }
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "table.furniture")
                        Text("Switch Table")
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(8)
                    .foregroundColor(.white)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
            .background(Color(red: 0.08, green: 0.08, blue: 0.09))
            
            // Category Filter ScrollView
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(categories, id: \.self) { cat in
                        Button(action: { selectedCategory = cat }) {
                            Text(cat)
                                .font(.system(size: 13, weight: .semibold))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(selectedCategory == cat ? Color.orange : Color.white.opacity(0.08))
                                .foregroundColor(selectedCategory == cat ? .white : .gray)
                                .cornerRadius(20)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
            .background(Color(red: 0.06, green: 0.06, blue: 0.07))
            
            // Menu Items List
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(filteredItems) { item in
                        Button(action: {
                            addItemToCart(item)
                        }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item.name)
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(.white)
                                    Text(item.description)
                                        .font(.system(size: 12))
                                        .foregroundColor(.gray)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)
                                }
                                
                                Spacer()
                                
                                Text(item.formattedPrice)
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(.orange)
                                    .padding(.leading, 8)
                            }
                            .padding(14)
                            .frame(minHeight: 56) // 48px touch target rule
                            .background(Color.white.opacity(0.04))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
                            )
                        }
                    }
                }
                .padding()
            }
            
            // Bottom Sticky Thumb-Zone Action Bar (Jakob's Law)
            if !cartItems.isEmpty {
                VStack(spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(cartItems.reduce(0) { $0 + $1.quantity }) items for \(selectedTable)")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.gray)
                            Text(formattedCartTotal)
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.white)
                        }
                        
                        Spacer()
                        
                        Button(action: {
                            sendOrderToKitchen()
                        }) {
                            HStack(spacing: 6) {
                                Image(systemName: "flame.fill")
                                Text("Send to Kitchen")
                            }
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .frame(height: 50)
                            .background(Color.orange)
                            .cornerRadius(25)
                            .shadow(color: Color.orange.opacity(0.4), radius: 8, y: 4)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color(red: 0.1, green: 0.1, blue: 0.12))
                }
            }
        }
        .background(Color(red: 0.05, green: 0.05, blue: 0.06).ignoresSafeArea())
        .overlay(
            Group {
                if orderSentBanner {
                    VStack {
                        HStack(spacing: 10) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text("Ticket Fired to Kitchen!")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(Color(red: 0.15, green: 0.15, blue: 0.18))
                        .cornerRadius(30)
                        .shadow(radius: 10)
                        .padding(.top, 10)
                        Spacer()
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
        )
    }
    
    private func addItemToCart(_ item: MenuItem) {
        if let idx = cartItems.firstIndex(where: { $0.menuItemId == item.id }) {
            cartItems[idx].quantity += 1
        } else {
            let orderItem = OrderItem(
                menuItemId: item.id,
                name: item.name,
                priceCents: item.priceCents,
                quantity: 1,
                modifiers: [],
                instructions: ""
            )
            cartItems.append(orderItem)
        }
    }
    
    private func sendOrderToKitchen() {
        guard !cartItems.isEmpty else { return }
        api.dispatchOrder(tableNumber: selectedTable, items: cartItems)
        cartItems.removeAll()
        
        withAnimation {
            orderSentBanner = true
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            withAnimation {
                orderSentBanner = false
            }
        }
    }
}
