import Foundation

#if canImport(AppIntents)
import AppIntents
#endif

// MARK: - Codable model stored in UserDefaults

/// Lightweight representation written by JS via `syncTriggers`.
struct ShortcutTriggerItem: Codable {
  let id: String
  let name: String
  let serverName: String
}

// MARK: - Helpers

/// Reads the triggers array from UserDefaults (written by `AppleShortcutsModule`).
func loadTriggerItems() -> [ShortcutTriggerItem] {
  guard let json = UserDefaults.standard.string(forKey: AppleShortcutsModule.triggersKey),
        let data = json.data(using: .utf8),
        let items = try? JSONDecoder().decode([ShortcutTriggerItem].self, from: data) else {
    return []
  }
  return items
}

// MARK: - AppIntents (iOS 16+)

#if canImport(AppIntents)

// ──────────────────────────────────────────────
// TriggerEntity – represents a single trigger
// ──────────────────────────────────────────────

@available(iOS 16.0, *)
struct TriggerEntity: AppEntity {
  var id: String
  var name: String
  var serverName: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Trigger"

  static var defaultQuery = TriggerEntityQuery()

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: "\(name)",
      subtitle: "\(serverName)"
    )
  }
}

// ──────────────────────────────────────────────
// TriggerEntityQuery – provides trigger options
// ──────────────────────────────────────────────

@available(iOS 16.0, *)
struct TriggerEntityQuery: EntityQuery, EntityStringQuery {
  /// System asks for specific entities by ID (e.g. when running a saved shortcut).
  func entities(for identifiers: [TriggerEntity.ID]) async throws -> [TriggerEntity] {
    let all = Self.allEntities()
    return all.filter { identifiers.contains($0.id) }
  }

  /// Displayed when the user picks a trigger in the Shortcuts editor.
  func suggestedEntities() async throws -> [TriggerEntity] {
    return Self.allEntities()
  }

  /// Free-text search in the Shortcuts parameter picker.
  func entities(matching string: String) async throws -> [TriggerEntity] {
    let lower = string.lowercased()
    return Self.allEntities().filter {
      $0.name.lowercased().contains(lower) || $0.serverName.lowercased().contains(lower)
    }
  }

  private static func allEntities() -> [TriggerEntity] {
    return loadTriggerItems().map {
      TriggerEntity(id: $0.id, name: $0.name, serverName: $0.serverName)
    }
  }
}

// ──────────────────────────────────────────────
// RunTriggerIntent – the Shortcuts action
// ──────────────────────────────────────────────

@available(iOS 16.0, *)
struct RunTriggerIntent: AppIntent {
  static var title: LocalizedStringResource = "Run Trigger"
  static var description: IntentDescription = IntentDescription(
    "Sends a pre-configured message to your AI assistant.",
    categoryName: "Triggers"
  )

  /// Opens the app so the chat screen can send the message.
  static var openAppWhenRun: Bool = true

  @Parameter(title: "Trigger")
  var trigger: TriggerEntity

  func perform() async throws -> some IntentResult {
    // Write the slug so the app can pick it up on activation.
    UserDefaults.standard.set(trigger.id, forKey: AppleShortcutsModule.pendingTriggerKey)

    // Post an in-process notification so the Expo module reacts immediately
    // when the app is already in the foreground.
    await MainActor.run {
      NotificationCenter.default.post(name: .appleShortcutTriggerPending, object: nil)
    }

    return .result()
  }
}

// ──────────────────────────────────────────────
// LumiereShortcuts – makes the action appear in
// the Shortcuts app gallery automatically.
// ──────────────────────────────────────────────

@available(iOS 16.0, *)
struct LumiereShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: RunTriggerIntent(),
      phrases: [
        "Run \(\.$trigger) in \(.applicationName)",
        "Send \(\.$trigger) with \(.applicationName)",
        "Trigger \(\.$trigger) in \(.applicationName)",
      ],
      shortTitle: "Run Trigger",
      systemImageName: "bolt.fill"
    )
  }
}

#endif
