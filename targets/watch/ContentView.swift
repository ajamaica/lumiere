import SwiftUI

struct ContentView: View {
    @ObservedObject var session: WatchSessionManager

    var body: some View {
        TabView {
            // Home tab
            VStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 32))
                    .foregroundStyle(.yellow)

                Text("Lumiere")
                    .font(.headline)

                if let server = session.servers.first(where: { $0.id == session.currentServerId }) {
                    Text(server.name)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                } else {
                    Text("No server selected")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            // Servers tab
            ServerListView(session: session)
        }
        .tabViewStyle(.verticalPage)
    }
}

#Preview {
    ContentView(session: WatchSessionManager.shared)
}
