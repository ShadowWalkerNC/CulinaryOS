import SwiftUI

public struct KeypadPinView: View {
    @ObservedObject var api = CulinaryAPIClient.shared
    @State private var enteredPin: String = ""
    @State private var errorMessage: String? = nil
    @State private var isAuthenticating: Bool = false
    @State private var showingServerSettings: Bool = false

    private let keypadNumbers: [[String]] = [
        ["1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9"],
        ["C", "0", "⌫"]
    ]

    public init() {}

    public var body: some View {
        VStack(spacing: 20) {
            // Top Connection Status & Server Config Pill
            HStack {
                Button(action: { showingServerSettings = true }) {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(api.isConnected ? Color.green : Color.orange)
                            .frame(width: 8, height: 8)
                        Text(api.isConnected ? "LAN/Cloud: \(api.serverBaseURL)" : "Offline Mode (\(api.pendingOfflineOrders.count) queued)")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.gray)
                            .lineLimit(1)
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 11))
                            .foregroundColor(.orange)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(20)
                }
                Spacer()
            }
            .padding(.horizontal, 8)

            Spacer()

            // Header
            VStack(spacing: 8) {
                Image(systemName: "fork.knife.circle.fill")
                    .resizable()
                    .frame(width: 64, height: 64)
                    .foregroundColor(Color.orange)

                Text("CulinaryOS Handheld")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)

                Text(isAuthenticating ? "Verifying Staff Credentials..." : "Enter 4-Digit Staff PIN")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
            }

            // PIN Indicators
            HStack(spacing: 16) {
                ForEach(0..<4) { index in
                    Circle()
                        .fill(index < enteredPin.count ? Color.orange : Color.white.opacity(0.15))
                        .frame(width: 18, height: 18)
                        .overlay(
                            Circle()
                                .stroke(Color.white.opacity(0.3), lineWidth: 1)
                        )
                }
            }
            .padding(.vertical, 10)

            if let error = errorMessage {
                Text(error)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.red)
                    .transition(.opacity)
            }

            // Keypad Grid (78x78pt touch targets > 48px minimum)
            VStack(spacing: 14) {
                ForEach(keypadNumbers, id: \.self) { row in
                    HStack(spacing: 18) {
                        ForEach(row, id: \.self) { key in
                            Button(action: {
                                handleKeyPress(key)
                            }) {
                                Text(key)
                                    .font(.system(size: 26, weight: .semibold))
                                    .foregroundColor(key == "C" ? .red : (key == "⌫" ? .orange : .white))
                                    .frame(width: 78, height: 78)
                                    .background(Color.white.opacity(0.08))
                                    .clipShape(Circle())
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                                    )
                            }
                            .disabled(isAuthenticating)
                        }
                    }
                }
            }

            Spacer()

            // Fast Demo Shortcuts
            HStack(spacing: 12) {
                Button("Server PIN (1234)") {
                    enteredPin = "1234"
                    verifyPin()
                }
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.gray)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.05))
                .cornerRadius(8)

                Button("Manager PIN (5678)") {
                    enteredPin = "5678"
                    verifyPin()
                }
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.gray)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.05))
                .cornerRadius(8)
            }
            .padding(.bottom, 12)
        }
        .padding()
        .background(Color(red: 0.05, green: 0.05, blue: 0.06).ignoresSafeArea())
        .sheet(isPresented: $showingServerSettings) {
            NavigationStack {
                Form {
                    Section("Restaurant API Gateway") {
                        TextField("Server Base URL", text: $api.serverBaseURL)
                            .autocorrectionDisabled()
                        TextField("Tenant UUID", text: $api.tenantId)
                            .autocorrectionDisabled()
                    }
                    Section("Quick Environment Presets") {
                        Button("Local Development (http://localhost:3000)") {
                            api.serverBaseURL = "http://localhost:3000"
                        }
                        Button("Restaurant LAN Gateway (http://192.168.40.1:3000)") {
                            api.serverBaseURL = "http://192.168.40.1:3000"
                        }
                        Button("Railway Cloud Demo (https://culinaryos-demo.up.railway.app)") {
                            api.serverBaseURL = "https://culinaryos-demo.up.railway.app"
                        }
                    }
                }
                .navigationTitle("Handheld Settings")
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { showingServerSettings = false }
                    }
                }
            }
        }
    }

    private func handleKeyPress(_ key: String) {
        errorMessage = nil
        if key == "C" {
            enteredPin = ""
        } else if key == "⌫" {
            if !enteredPin.isEmpty {
                enteredPin.removeLast()
            }
        } else if enteredPin.count < 4 {
            enteredPin.append(key)
            if enteredPin.count == 4 {
                verifyPin()
            }
        }
    }

    private func verifyPin() {
        let pinToVerify = enteredPin
        isAuthenticating = true
        Task {
            let ok = await api.loginWithPIN(pinToVerify)
            isAuthenticating = false
            if ok {
                enteredPin = ""
                errorMessage = nil
            } else {
                errorMessage = "Invalid Staff PIN. Please try again."
                enteredPin = ""
            }
        }
    }
}
