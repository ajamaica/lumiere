import SwiftUI

/// Detail view that displays the AI response for a trigger or voice message.
struct ResponseView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    let triggerName: String?
    let onDismiss: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                // Show the trigger name or dictated text at the top
                if let name = triggerName {
                    Text(name)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                if sessionManager.isLoading {
                    loadingView
                } else if let error = sessionManager.errorMessage {
                    errorView(error)
                } else if let response = sessionManager.latestResponse {
                    responseView(response)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 4)
        }
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button(String(localized: "watch.response.done")) {
                    onDismiss()
                }
            }
        }
    }

    // MARK: - Subviews

    private var loadingView: some View {
        HStack(spacing: 8) {
            ProgressView()
            Text("watch.response.loading")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .padding(.top, 16)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle")
                .font(.title3)
                .foregroundStyle(.orange)

            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .padding(.top, 16)
    }

    private func responseView(_ response: String) -> some View {
        Text(response)
            .font(.body)
    }
}
