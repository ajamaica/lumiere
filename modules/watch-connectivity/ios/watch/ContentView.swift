import SwiftUI

/// Main view for the Lumiere watchOS app.
/// Displays a list of configured triggers and a voice dictation button.
struct ContentView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    @State private var showingResponse = false
    @State private var activeTriggerName: String?
    @State private var dictatedText: String = ""

    var body: some View {
        NavigationStack {
            Group {
                if sessionManager.triggers.isEmpty {
                    emptyState
                } else {
                    triggerList
                }
            }
            .navigationTitle(String(localized: "watch.triggers.title"))
            .navigationDestination(isPresented: $showingResponse) {
                ResponseView(
                    triggerName: activeTriggerName,
                    onDismiss: {
                        showingResponse = false
                        sessionManager.clearResponse()
                    }
                )
                .environmentObject(sessionManager)
            }
        }
        .onChange(of: sessionManager.latestResponse) { _, newValue in
            if newValue != nil {
                showingResponse = true
            }
        }
        .onChange(of: sessionManager.errorMessage) { _, newValue in
            if newValue != nil {
                showingResponse = true
            }
        }
    }

    // MARK: - Subviews

    private var emptyState: some View {
        ScrollView {
            VStack(spacing: 12) {
                Image(systemName: "bolt.slash")
                    .font(.system(size: 32))
                    .foregroundStyle(.secondary)

                Text("watch.triggers.empty")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 20)
        }
    }

    private var triggerList: some View {
        List {
            // Voice dictation — SwiftUI-native text field that invokes
            // the system voice input on watchOS
            TextField(
                String(localized: "watch.dictate.button"),
                text: $dictatedText
            )
            .onSubmit {
                submitDictation()
            }

            // Trigger items
            ForEach(sessionManager.triggers) { trigger in
                Button(action: { fireTrigger(trigger) }) {
                    VStack(alignment: .leading, spacing: 2) {
                        Label(trigger.name, systemImage: "bolt.fill")
                            .font(.body)
                            .lineLimit(2)

                        Text(trigger.serverName)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    // MARK: - Actions

    private func fireTrigger(_ trigger: WatchTrigger) {
        activeTriggerName = trigger.name
        sessionManager.sendTriggerRequest(slug: trigger.id)
        showingResponse = true
    }

    private func submitDictation() {
        let text = dictatedText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        activeTriggerName = text
        sessionManager.sendVoiceMessage(text: text)
        showingResponse = true
        dictatedText = ""
    }
}
