import ExpoModulesCore
import WatchConnectivity

/// Expo native module that syncs server data to the companion Apple Watch app
/// via the WatchConnectivity framework (WCSession).
///
/// JS calls `syncServers` whenever the server list or current server changes.
/// The module sends the data through `updateApplicationContext` so the watch
/// always receives the latest state, even if it wasn't reachable at the time.
public class WatchConnectivityModule: Module {
  private var session: WCSession?
  private let delegate = SessionDelegate()

  public func definition() -> ModuleDefinition {
    Name("WatchConnectivity")

    OnCreate {
      guard WCSession.isSupported() else { return }
      let wcSession = WCSession.default
      wcSession.delegate = self.delegate
      wcSession.activate()
      self.session = wcSession
    }

    /// Returns true when the paired watch has the companion app installed.
    Function("isWatchAppInstalled") { () -> Bool in
      guard let s = self.session, s.activationState == .activated else { return false }
      return s.isWatchAppInstalled
    }

    /// Push the server list and current server ID to the watch.
    /// Uses `updateApplicationContext` which queues the latest state and
    /// delivers it to the watch the next time it wakes.
    AsyncFunction("syncServers") { (serversJson: String, currentServerId: String) in
      guard let s = self.session, s.activationState == .activated else { return }
      try s.updateApplicationContext([
        "servers": serversJson,
        "currentServerId": currentServerId,
      ])
    }
  }
}

// MARK: - WCSessionDelegate

/// Minimal delegate — required to activate WCSession on iOS.
private class SessionDelegate: NSObject, WCSessionDelegate {
  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {}

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }
}
