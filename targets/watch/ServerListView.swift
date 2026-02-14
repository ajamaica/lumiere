import SwiftUI

struct ServerListView: View {
    @ObservedObject var session: WatchSessionManager

    var body: some View {
        Group {
            if session.servers.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "antenna.radiowaves.left.and.right.slash")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                    Text("No Servers")
                        .font(.headline)
                    Text("Open Lumiere on your iPhone to sync servers.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
            } else {
                List(session.servers) { server in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(server.name)
                                .font(.headline)
                                .lineLimit(1)
                            Text(server.providerType)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if server.id == session.currentServerId {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                                .font(.caption)
                        }
                    }
                }
            }
        }
    }
}
