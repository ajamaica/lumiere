import Foundation
import WatchConnectivity

/// Receives server data from the companion iOS app via WCSession.
/// Published properties drive SwiftUI view updates automatically.
final class WatchSessionManager: NSObject, ObservableObject {
    static let shared = WatchSessionManager()

    @Published var servers: [ServerItem] = []
    @Published var currentServerId: String = ""

    private override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Decode the servers JSON string sent from the iOS app.
    private func applyContext(_ context: [String: Any]) {
        if let json = context["servers"] as? String,
           let data = json.data(using: .utf8),
           let dict = try? JSONDecoder().decode([String: ServerItem].self, from: data) {
            DispatchQueue.main.async {
                self.servers = dict.values.sorted { $0.createdAt < $1.createdAt }
            }
        }
        if let id = context["currentServerId"] as? String {
            DispatchQueue.main.async {
                self.currentServerId = id
            }
        }
    }
}

// MARK: - WCSessionDelegate

extension WatchSessionManager: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        // Read any previously received context on activation
        if activationState == .activated {
            applyContext(session.receivedApplicationContext)
        }
    }

    func session(
        _ session: WCSession,
        didReceiveApplicationContext applicationContext: [String: Any]
    ) {
        applyContext(applicationContext)
    }
}

// MARK: - Data model

/// Mirrors the JS `ServerConfig` type (only the fields the watch needs).
struct ServerItem: Codable, Identifiable {
    let id: String
    let name: String
    let url: String
    let providerType: String
    let model: String?
    let createdAt: Double
}
