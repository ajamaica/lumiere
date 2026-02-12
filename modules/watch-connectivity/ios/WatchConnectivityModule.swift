import ExpoModulesCore
import Foundation
import WatchConnectivity

/// Expo native module that bridges WatchConnectivity between the iOS app
/// and the watchOS companion app.
///
/// JS calls `syncTriggers` whenever the trigger list changes. The module sends
/// the data to the Watch via `updateApplicationContext`.
///
/// When the Watch sends a trigger request or voice message, the module emits
/// events so the JS layer can execute the trigger and send back a response.
public class WatchConnectivityModule: Module {
  private var sessionDelegate: WCSessionDelegateHandler?

  public func definition() -> ModuleDefinition {
    Name("WatchConnectivity")

    Events("onWatchTriggerRequest", "onWatchVoiceMessage")

    /// Returns true when a Watch is paired with this iPhone.
    Function("isWatchPaired") { () -> Bool in
      guard WCSession.isSupported() else { return false }
      return WCSession.default.isPaired
    }

    /// Returns true when the companion Watch app is installed.
    Function("isWatchAppInstalled") { () -> Bool in
      guard WCSession.isSupported() else { return false }
      return WCSession.default.isWatchAppInstalled
    }

    /// Persist the current triggers list and send to the Watch via application context.
    /// `triggersJson` is a JSON array of {id, name, serverName} objects.
    AsyncFunction("syncTriggers") { (triggersJson: String) in
      guard WCSession.isSupported() else { return }
      let session = WCSession.default
      guard session.activationState == .activated else { return }

      do {
        try session.updateApplicationContext(["triggers": triggersJson])
      } catch {
        // Application context update failed — non-fatal
      }
    }

    /// Send an AI response back to the Watch for display.
    AsyncFunction("sendResponseToWatch") { (slug: String, response: String) in
      guard WCSession.isSupported() else { return }
      let session = WCSession.default
      guard session.activationState == .activated else { return }

      let payload: [String: Any] = [
        "type": "triggerResponse",
        "slug": slug,
        "response": response,
      ]

      // Use transferUserInfo for reliable delivery even if Watch app is not reachable
      if session.isReachable {
        session.sendMessage(payload, replyHandler: nil, errorHandler: { _ in
          // Fall back to transferUserInfo if sendMessage fails
          session.transferUserInfo(payload)
        })
      } else {
        session.transferUserInfo(payload)
      }
    }

    OnCreate {
      guard WCSession.isSupported() else { return }

      let handler = WCSessionDelegateHandler { [weak self] event in
        switch event {
        case .triggerRequest(let slug):
          self?.sendEvent("onWatchTriggerRequest", ["slug": slug])
        case .voiceMessage(let text):
          self?.sendEvent("onWatchVoiceMessage", ["text": text])
        }
      }

      self.sessionDelegate = handler
      WCSession.default.delegate = handler
      WCSession.default.activate()
    }
  }
}

// MARK: - WCSession Delegate Handler

enum WatchEvent {
  case triggerRequest(slug: String)
  case voiceMessage(text: String)
}

class WCSessionDelegateHandler: NSObject, WCSessionDelegate {
  private let onEvent: (WatchEvent) -> Void

  init(onEvent: @escaping (WatchEvent) -> Void) {
    self.onEvent = onEvent
    super.init()
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    // Activation completed
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    // Re-activate for multi-watch switching
    session.activate()
  }

  /// Handle messages received from the Watch.
  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    handleIncomingMessage(message)
  }

  /// Handle messages with reply handler from the Watch.
  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    handleIncomingMessage(message)
    replyHandler(["status": "received"])
  }

  /// Handle application context updates from the Watch.
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    // Currently no Watch→Phone context updates are expected
  }

  /// Handle user info transfers from the Watch.
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    handleIncomingMessage(userInfo)
  }

  private func handleIncomingMessage(_ message: [String: Any]) {
    guard let type = message["type"] as? String else { return }

    DispatchQueue.main.async {
      switch type {
      case "triggerRequest":
        if let slug = message["slug"] as? String {
          self.onEvent(.triggerRequest(slug: slug))
        }
      case "voiceMessage":
        if let text = message["text"] as? String {
          self.onEvent(.voiceMessage(text: text))
        }
      default:
        break
      }
    }
  }
}
