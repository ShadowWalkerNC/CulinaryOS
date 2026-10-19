import SwiftUI

public struct KeypadPinView: View {
    @ObservedObject var api = CulinaryAPIClient.shared
    @State private var enteredPin: String = ""
    @State private var errorMessage: String? = nil
    
    private let keypadNumbers: [[String]] = [
        ["1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9"],
        ["C", "0", "⌫"]
    ]
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 24) {
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
                
                Text("Enter 4-Digit Staff PIN")
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
            .padding(.vertical, 12)
            
            if let error = errorMessage {
                Text(error)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.red)
                    .transition(.opacity)
            }
            
            // Keypad Grid
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
                .padding(.vertical, 8)
                .background(Color.white.opacity(0.05))
                .cornerRadius(8)
                
                Button("Manager PIN (5678)") {
                    enteredPin = "5678"
                    verifyPin()
                }
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.gray)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.white.opacity(0.05))
                .cornerRadius(8)
            }
            .padding(.bottom, 16)
        }
        .padding()
        .background(Color(red: 0.05, green: 0.05, blue: 0.06).ignoresSafeArea())
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
        if api.loginWithPIN(enteredPin) {
            enteredPin = ""
            errorMessage = nil
        } else {
            errorMessage = "Invalid Staff PIN. Please try again."
            enteredPin = ""
        }
    }
}
