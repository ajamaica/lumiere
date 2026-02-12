import WatchKit

/// WKApplicationDelegate that activates the WatchConnectivity session on launch.
class ExtensionDelegate: NSObject, WKApplicationDelegate {
    func applicationDidFinishLaunching() {
        WatchSessionManager.shared.activate()
    }

    func applicationDidBecomeActive() {
        // Re-check session state when app becomes active
        WatchSessionManager.shared.activate()
    }
}
