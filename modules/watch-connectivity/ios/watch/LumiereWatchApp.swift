import SwiftUI

@main
struct LumiereWatchApp: App {
    @WKApplicationDelegateAdaptor(ExtensionDelegate.self) var delegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(WatchSessionManager.shared)
        }
    }
}
