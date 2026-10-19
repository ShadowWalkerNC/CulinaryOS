import SwiftUI

public struct ContentView: View {
    @ObservedObject var api = CulinaryAPIClient.shared
    
    public init() {}
    
    public var body: some View {
        Group {
            if api.currentUser == nil {
                KeypadPinView()
            } else {
                TabView {
                    // 1. Tableside Order Entry
                    NavigationStack {
                        TablesideOrderView()
                            .navigationTitle("Tableside")
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar {
                                ToolbarItem(placement: .topBarTrailing) {
                                    Button(action: { api.logout() }) {
                                        HStack(spacing: 4) {
                                            Image(systemName: "lock.fill")
                                            Text("Lock")
                                        }
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(.orange)
                                    }
                                }
                            }
                    }
                    .tabItem {
                        Label("Tableside", systemImage: "fork.knife")
                    }
                    
                    // 2. Active Orders & Tickets
                    NavigationStack {
                        ActiveTicketsView()
                            .navigationTitle("Kitchen Tickets")
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar {
                                ToolbarItem(placement: .topBarTrailing) {
                                    Button(action: { api.logout() }) {
                                        HStack(spacing: 4) {
                                            Image(systemName: "lock.fill")
                                            Text("Lock")
                                        }
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(.orange)
                                    }
                                }
                            }
                    }
                    .tabItem {
                        Label("Tickets", systemImage: "ticket.fill")
                    }
                }
                .tint(.orange)
            }
        }
    }
}
