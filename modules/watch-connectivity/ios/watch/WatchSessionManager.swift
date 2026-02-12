import Foundation
import WatchConnectivity

/// Manages the WatchConnectivity session on the watchOS side.
/// Maintains the trigger list received from the phone and handles
/// sending requests and receiving AI responses.
class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchSessionManager()

    @Published var triggers: [WatchTrigger] = []
    @Published var latestResponse: String?
    @Published var latestResponseSlug: String?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private override init() {
        super.init()
    }

    /// Activate the WCSession. Call on app launch.
    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Send a trigger request to the iPhone app.
    func sendTriggerRequest(slug: String) {
        guard WCSession.default.activationState == .activated else { return }

        isLoading = true
        latestResponse = nil
        latestResponseSlug = slug
        errorMessage = nil

        let message: [String: Any] = [
            "type": "triggerRequest",
            "slug": slug,
        ]

        if WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: nil) { [weak self] _ in
                DispatchQueue.main.async {
                    // Fall back to transferUserInfo
                    WCSession.default.transferUserInfo(message)
                }
                // Set a timeout for unreachable phone
                DispatchQueue.main.asyncAfter(deadline: .now() + 30) {
                    guard let self = self, self.isLoading, self.latestResponseSlug == slug else { return }
                    self.isLoading = false
                    self.errorMessage = String(localized: "watch.response.error")
                }
            }
        } else {
            WCSession.default.transferUserInfo(message)
            // Set a timeout for background delivery
            DispatchQueue.main.asyncAfter(deadline: .now() + 30) { [weak self] in
                guard let self = self, self.isLoading, self.latestResponseSlug == slug else { return }
                self.isLoading = false
                self.errorMessage = String(localized: "watch.response.error")
            }
        }
    }

    /// Send a voice-dictated message to the iPhone app.
    func sendVoiceMessage(text: String) {
        guard WCSession.default.activationState == .activated else { return }

        isLoading = true
        latestResponse = nil
        latestResponseSlug = "voice"
        errorMessage = nil

        let message: [String: Any] = [
            "type": "voiceMessage",
            "text": text,
        ]

        if WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: nil) { _ in
                WCSession.default.transferUserInfo(message)
            }
        } else {
            WCSession.default.transferUserInfo(message)
        }

        // Set a timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 30) { [weak self] in
            guard let self = self, self.isLoading else { return }
            self.isLoading = false
            self.errorMessage = String(localized: "watch.response.error")
        }
    }

    /// Clear the current response state.
    func clearResponse() {
        latestResponse = nil
        latestResponseSlug = nil
        errorMessage = nil
        isLoading = false
    }

    // MARK: - WCSessionDelegate

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        // Load triggers from the current application context on activation
        if activationState == .activated {
            DispatchQueue.main.async {
                self.processApplicationContext(session.receivedApplicationContext)
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.processApplicationContext(applicationContext)
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            self.handleIncomingMessage(message)
        }
    }

    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        DispatchQueue.main.async {
            self.handleIncomingMessage(message)
        }
        replyHandler(["status": "received"])
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        DispatchQueue.main.async {
            self.handleIncomingMessage(userInfo)
        }
    }

    // MARK: - Private

    private func processApplicationContext(_ context: [String: Any]) {
        guard let triggersJson = context["triggers"] as? String,
              let data = triggersJson.data(using: .utf8)
        else { return }

        do {
            let decoded = try JSONDecoder().decode([WatchTrigger].self, from: data)
            triggers = decoded
        } catch {
            // JSON decoding failed — keep existing triggers
        }
    }

    private func handleIncomingMessage(_ message: [String: Any]) {
        guard let type = message["type"] as? String else { return }

        switch type {
        case "triggerResponse":
            if let response = message["response"] as? String {
                isLoading = false
                latestResponse = response
                errorMessage = nil
            }
        default:
            break
        }
    }
}
