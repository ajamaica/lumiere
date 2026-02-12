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
            // Voice dictation button
            Button(action: startDictation) {
                Label(String(localized: "watch.dictate.button"), systemImage: "mic.fill")
                    .foregroundStyle(.blue)
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

    private func startDictation() {
        // On watchOS, we present text input with dictation
        // WKExtension doesn't have a direct dictation API in SwiftUI,
        // but we can use the TextInputController pattern via presentTextInputController
        // For SwiftUI, we use a simple TextField approach that triggers voice input
        activeTriggerName = nil

        #if os(watchOS)
        WKExtension.shared().visibleInterfaceController?.presentTextInputController(
            withSuggestions: nil,
            allowedInputMode: .plain
        ) { results in
            guard let text = results?.first as? String, !text.isEmpty else { return }
            DispatchQueue.main.async {
                self.dictatedText = text
                self.activeTriggerName = text
                sessionManager.sendVoiceMessage(text: text)
                self.showingResponse = true
            }
        }
        #endif
    }
}
