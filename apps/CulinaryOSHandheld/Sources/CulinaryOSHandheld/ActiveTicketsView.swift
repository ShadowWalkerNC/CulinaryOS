import SwiftUI

public struct ActiveTicketsView: View {
    @ObservedObject var api = CulinaryAPIClient.shared
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Active Tickets")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                
                Spacer()
                
                Text("\(api.activeOrders.count) Active")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.orange)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.orange.opacity(0.15))
                    .cornerRadius(8)
            }
            .padding()
            .background(Color(red: 0.08, green: 0.08, blue: 0.09))
            
            // Tickets List
            if api.activeOrders.isEmpty {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "tray.fill")
                        .font(.system(size: 48))
                        .foregroundColor(.gray.opacity(0.4))
                    Text("No Active Tickets")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.gray)
                    Text("All dining room and kitchen orders are fulfilled.")
                        .font(.system(size: 13))
                        .foregroundColor(.gray.opacity(0.7))
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(api.activeOrders) { order in
                            VStack(alignment: .leading, spacing: 10) {
                                // Order Header
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        HStack(spacing: 8) {
                                            Text(order.tableNumber)
                                                .font(.system(size: 18, weight: .bold))
                                                .foregroundColor(.white)
                                            Text(order.orderNumber)
                                                .font(.system(size: 13, weight: .semibold))
                                                .foregroundColor(.gray)
                                        }
                                        Text("Server: \(order.serverName)")
                                            .font(.system(size: 12))
                                            .foregroundColor(.gray)
                                    }
                                    
                                    Spacer()
                                    
                                    // Status Badge
                                    Text(order.status.uppercased())
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(statusColor(order.status))
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(statusColor(order.status).opacity(0.15))
                                        .cornerRadius(6)
                                }
                                
                                Divider()
                                    .background(Color.white.opacity(0.1))
                                
                                // Items Breakdown
                                VStack(alignment: .leading, spacing: 6) {
                                    ForEach(order.items) { item in
                                        HStack {
                                            Text("\(item.quantity)x \(item.name)")
                                                .font(.system(size: 14, weight: .medium))
                                                .foregroundColor(.white)
                                            Spacer()
                                            Text(item.formattedTotal)
                                                .font(.system(size: 13))
                                                .foregroundColor(.gray)
                                        }
                                        if !item.modifiers.isEmpty {
                                            Text("  • " + item.modifiers.joined(separator: ", "))
                                                .font(.system(size: 12))
                                                .foregroundColor(.orange.opacity(0.8))
                                        }
                                    }
                                }
                                
                                Divider()
                                    .background(Color.white.opacity(0.1))
                                
                                // Footer & Bump Action
                                HStack {
                                    Text("Total: \(order.formattedTotal)")
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundColor(.white)
                                    
                                    Spacer()
                                    
                                    if order.status == "fired" {
                                        Button(action: {
                                            api.bumpOrderStatus(orderId: order.id, newStatus: "ready")
                                        }) {
                                            HStack(spacing: 4) {
                                                Image(systemName: "checkmark.circle.fill")
                                                Text("Mark Ready")
                                            }
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(Color.green)
                                            .cornerRadius(8)
                                        }
                                    } else if order.status == "ready" {
                                        Button(action: {
                                            api.bumpOrderStatus(orderId: order.id, newStatus: "paid")
                                        }) {
                                            HStack(spacing: 4) {
                                                Image(systemName: "creditcard.fill")
                                                Text("Close & Pay")
                                            }
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(Color.blue)
                                            .cornerRadius(8)
                                        }
                                    }
                                }
                            }
                            .padding(14)
                            .background(Color.white.opacity(0.04))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
                            )
                        }
                    }
                    .padding()
                }
            }
        }
        .background(Color(red: 0.05, green: 0.05, blue: 0.06).ignoresSafeArea())
    }
    
    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "fired": return .orange
        case "ready": return .green
        case "paid": return .blue
        default: return .gray
        }
    }
}
