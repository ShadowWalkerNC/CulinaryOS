import SwiftUI

public struct TablesideOrderView: View {
    @ObservedObject var api = CulinaryAPIClient.shared
    @State private var selectedTable: String = "T-01"
    @State private var selectedCategory: String = "All"
    @State private var selectedSeat: Int = 1
    @State private var selectedCourse: Int = 1
    @State private var cartItems: [OrderItem] = []
    @State private var orderSentBanner: Bool = false

    let tables = ["T-01", "T-02", "T-03", "T-04", "Bar-01", "Bar-02", "Patio-01", "Patio-02"]
    let categories = ["All", "Starters", "Mains", "Beverages"]
    let seats = [1, 2, 3, 4]

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
                    HStack(spacing: 6) {
                        Text(selectedTable)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)
                        Circle()
                            .fill(api.isConnected ? Color.green : Color.orange)
                            .frame(width: 8, height: 8)
                    }
                    Text("Server: \(api.currentUser?.name ?? "Server") • Seat S\(selectedSeat) • C\(selectedCourse)")
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
                        Text("Table")
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .padding(.horizontal, 12)
                    .frame(minHeight: 48)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(8)
                    .foregroundColor(.white)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(red: 0.08, green: 0.08, blue: 0.09))

            // Seat & Course Pacing Strip
            HStack(spacing: 8) {
                ForEach(seats, id: \.self) { seat in
                    Button(action: { selectedSeat = seat }) {
                        Text("S\(seat)")
                            .font(.system(size: 12, weight: .bold))
                            .frame(width: 48, height: 38)
                            .background(selectedSeat == seat ? Color.orange.opacity(0.25) : Color.white.opacity(0.06))
                            .foregroundColor(selectedSeat == seat ? .orange : .gray)
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(selectedSeat == seat ? Color.orange : Color.clear, lineWidth: 1)
                            )
                    }
                }

                Spacer()

                Button(action: { selectedCourse = (selectedCourse == 1 ? 2 : 1) }) {
                    HStack(spacing: 4) {
                        Image(systemName: selectedCourse == 1 ? "bolt.fill" : "clock.fill")
                        Text(selectedCourse == 1 ? "C1 Fire" : "C2 Hold")
                    }
                    .font(.system(size: 12, weight: .bold))
                    .padding(.horizontal, 12)
                    .frame(height: 38)
                    .background(selectedCourse == 1 ? Color.green.opacity(0.2) : Color.blue.opacity(0.2))
                    .foregroundColor(selectedCourse == 1 ? .green : .blue)
                    .cornerRadius(8)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 6)
            .background(Color(red: 0.07, green: 0.07, blue: 0.08))

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
                                    HStack(spacing: 6) {
                                        Text(item.name)
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(.white)
                                        if !item.allergens.isEmpty {
                                            Text(item.allergens.joined(separator: " • ").uppercased())
                                                .font(.system(size: 9, weight: .bold))
                                                .foregroundColor(.orange)
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(Color.orange.opacity(0.15))
                                                .cornerRadius(4)
                                        }
                                    }
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
                            Text(api.isConnected ? "Ticket Fired to Kitchen!" : "Queued in Offline Outbox!")
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
        if let idx = cartItems.firstIndex(where: { $0.menuItemId == item.id && $0.seatNumber == selectedSeat && $0.course == selectedCourse }) {
            cartItems[idx].quantity += 1
        } else {
            let orderItem = OrderItem(
                menuItemId: item.id,
                name: item.name,
                priceCents: item.priceCents,
                quantity: 1,
                seatNumber: selectedSeat,
                course: selectedCourse,
                modifiers: [],
                instructions: ""
            )
            cartItems.append(orderItem)
        }
    }

    private func sendOrderToKitchen() {
        guard !cartItems.isEmpty else { return }
        let itemsToDispatch = cartItems
        let table = selectedTable
        cartItems.removeAll()

        Task {
            await api.dispatchOrder(tableNumber: table, items: itemsToDispatch)
        }

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
