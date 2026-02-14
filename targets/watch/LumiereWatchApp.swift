import SwiftUI

@main
struct LumiereWatchApp: App {
    @StateObject private var sessionManager = WatchSessionManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView(session: sessionManager)
        }
    }
}
